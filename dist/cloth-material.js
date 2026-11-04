import * as THREE from "./assets/three.js";
const Iu = `
uniform float uTime;
uniform float uPhase;
uniform float uAmp;
uniform float uTwist;
uniform vec2 uBend;

// 0 en los hombros (apoyados en la percha), 1 en el bajo; las mangas también cuelgan libres
float clothWeight(vec3 p) {
  float w = smoothstep(-0.13, -0.72, p.y);
  return max(w, 0.6 * smoothstep(0.17, 0.26, abs(p.x)) * smoothstep(-0.13, -0.24, p.y));
}

// x: altura de la onda; yz: su pendiente en x e y (para recalcular la normal)
vec3 clothWave(vec3 p) {
  float a1 = uTime * 1.15 + p.x * 6.0 + p.y * 9.0 + uPhase;
  float a2 = uTime * 1.9 + p.x * 16.0 - p.y * 7.0 + uPhase * 1.7;
  float a3 = uTime * 0.55 + p.y * 2.5 + uPhase * 0.6;
  float gust = 0.65 + 0.35 * sin(uTime * 0.31 + uPhase * 2.3);
  float h = 0.5 * sin(a1) + 0.3 * sin(a2) + sin(a3);
  vec2 g = vec2(3.0 * cos(a1) + 4.8 * cos(a2), 4.5 * cos(a1) - 2.1 * cos(a2) + 2.5 * cos(a3));
  return vec3(h, g) * gust;
}

vec2 clothTurn(vec2 xz, float a) {
  float c = cos(a), s = sin(a);
  return vec2(c * xz.x + s * xz.y, -s * xz.x + c * xz.y);
}
`;
const Lu = `
float clothN = clothWeight(position * clothScale + clothCenter);
objectNormal.xy -= objectNormal.z * uAmp * clothN * clothWave(position * clothScale + clothCenter).yz;
objectNormal.xz = clothTurn(objectNormal.xz, uTwist * clothN);
objectNormal = normalize(objectNormal);
`;
const Ru = `
float clothW = clothWeight(position * clothScale + clothCenter);
transformed.z += uAmp * clothW * clothWave(position * clothScale + clothCenter).x;
transformed.xz += uBend * clothW * clothW;
transformed.xz = clothTurn(transformed.xz, uTwist * clothW);
`;

let weave;
function weaveNormal() {
  if (weave) return weave;
  const data = new Uint8Array(128 * 128 * 4);
  const wave = (x, y) =>
    0.5 +
    0.5 *
      Math.cos((x / 128) * 8 * Math.PI * 2) *
      Math.cos((y / 128) * 8 * Math.PI * 2);
  for (let y = 0; y < 128; y++)
    for (let x = 0; x < 128; x++) {
      const dx = (wave(x + 1, y) - wave(x - 1, y)) * 2.2;
      const dy = (wave(x, y + 1) - wave(x, y - 1)) * 2.2;
      const length = Math.hypot(dx, dy, 1),
        i = (y * 128 + x) * 4;
      data[i] = (-dx / length) * 127 + 128;
      data[i + 1] = (-dy / length) * 127 + 128;
      data[i + 2] = (1 / length) * 127 + 128;
      data[i + 3] = 255;
    }
  weave = new THREE.DataTexture(data, 128, 128);
  weave.wrapS = weave.wrapT = THREE.RepeatWrapping;
  weave.repeat.set(62, 40);
  weave.magFilter = THREE.LinearFilter;
  weave.minFilter = THREE.LinearMipmapLinearFilter;
  weave.generateMipmaps = true;
  weave.needsUpdate = true;
  return weave;
}
export function shirtMaterial(map, product, center, scale) {
  const uniforms = {
    uTime: { value: 0 },
    uPhase: { value: 0 },
    uAmp: { value: 0.009 / scale },
    uTwist: { value: 0 },
    uBend: { value: new THREE.Vector2() },
    clothCenter: { value: center },
    clothScale: { value: scale },
    uLining: { value: new THREE.Color(product.fabric) },
  };
  function compile(shader) {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform vec3 clothCenter;uniform float clothScale;\n" +
          Iu,
      )
      .replace(
        "#include <beginnormal_vertex>",
        "#include <beginnormal_vertex>\n" + Lu,
      )
      .replace("#include <begin_vertex>", "#include <begin_vertex>\n" + Ru);
  }
  const material = new THREE.MeshPhysicalMaterial({
    map,
    normalMap: weaveNormal(),
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughness: 0.66,
    sheen: 0.3,
    sheenRoughness: 0.5,
    sheenColor: 0xe6edff,
    vertexColors: true,
    side: THREE.DoubleSide,
  });
  material.onBeforeCompile = (shader) => {
    compile(shader);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uLining;")
      .replace(
        "#include <map_fragment>",
        "#include <map_fragment>\nif (!gl_FrontFacing) diffuseColor.rgb = uLining;",
      );
  };
  const depth = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    side: THREE.DoubleSide,
  });
  depth.onBeforeCompile = compile;
  material.userData.cloth = uniforms;
  return { material, depth };
}
