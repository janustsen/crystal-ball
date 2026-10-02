// Adapted from the supplied design: continuous domain-warped fog, shared by both orbs.
export const fogShader = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes; uniform float uT; uniform vec3 uOrb; uniform vec3 uAsk; uniform vec4 uMood;
float hs(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float ns(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hs(i), hs(i + vec2(1.0, 0.0)), u.x), mix(hs(i + vec2(0.0, 1.0)), hs(i + vec2(1.0, 1.0)), u.x), u.y); }
float fbm(vec2 p){ float v = 0.0; float a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) { v += a * ns(p); p = m * p + vec2(3.1, 1.7); a *= 0.5; } return v; }
void main(){
  vec2 fc = gl_FragCoord.xy;
  vec2 uv = fc / uRes.y;
  float asp = uRes.x / uRes.y;
  float T = uT;
  float t = T * 0.03;
  float flick = 0.86 + 0.14 * ns(vec2(uT * 2.3, 1.0)) + 0.05 * ns(vec2(uT * 7.1, 4.0));
  vec2 p = uv * vec2(2.0, 1.5) - vec2(0.0, t * 1.4);
  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - vec2(t * 0.7, 0.0)));
  vec2 r = vec2(fbm(p + 3.4 * q + vec2(1.7, 9.2) + 0.8 * t), fbm(p + 3.4 * q + vec2(8.3, 2.8) - 0.6 * t));
  float f = fbm(p + 3.0 * r);
  float fil = 1.0 - abs(f * 2.0 - 1.0);
  float life = fbm(uv * 1.1 + vec2(-t * 0.8, t * 0.4));
  float gate = smoothstep(0.38, 0.62, life);
  float d = smoothstep(0.80, 0.985, fil) * 0.8 + smoothstep(0.56, 0.9, f) * 0.45;
  float a = d * gate * 0.55 * uMood.y;
  vec2 lc = vec2(asp * 0.5, -0.08);
  float light = exp(-length((uv - lc) * vec2(1.1, 1.5)) * 2.1) * flick;
  vec3 smoke = mix(vec3(0.52, 0.5, 0.5), vec3(0.86, 0.8, 0.72), smoothstep(0.55, 0.9, f));
  vec3 col = mix(smoke, vec3(1.0, 0.7, 0.4), clamp(light * 1.25 * (0.6 + 0.8 * uMood.z), 0.0, 1.0));
  for (int orbIndex = 0; orbIndex < 2; orbIndex++) {
    vec3 orb = orbIndex == 0 ? uOrb : uAsk;
    if (orb.z <= 0.0) continue;
    vec2 l = (fc - orb.xy) / orb.z;
    float dist = length(l);
    if (dist >= 1.6) continue;
    // Advect through a doubly warped field. Never rotate, reverse time or wrap a pose.
    vec2 flow = vec2(T * 0.07, -T * 0.16);
    vec2 lp = l * 1.1 + flow;
    vec2 q2 = vec2(fbm(lp + vec2(0.0, T * 0.21)), fbm(lp + vec2(3.1, 7.7) + vec2(T * 0.13, -T * 0.05)));
    vec2 r2 = vec2(fbm(lp + 2.6 * q2 + vec2(1.7, 9.2) + T * 0.17), fbm(lp + 2.6 * q2 + vec2(8.3, 2.8) - T * 0.14));
    float f2 = fbm(lp + 2.2 * r2);
    float fil2 = 1.0 - abs(f2 * 2.0 - 1.0);
    // Cel-shaded smoke over dark glass: soft-edged tone bands, one inked contour, lit by the candle below.
    float dens = smoothstep(0.38, 0.8, f2) * 0.85 + smoothstep(0.7, 1.0, fil2) * 0.3;
    float shadowBand = smoothstep(0.2, 0.26, dens), midBand = smoothstep(0.46, 0.52, dens), lightBand = smoothstep(0.74, 0.8, dens);
    float ink = 1.0 - smoothstep(0.0, 0.04, abs(dens - 0.46));
    float edge = 1.0 - smoothstep(0.9, 1.0, dist);
    float inside = clamp(0.5 + shadowBand * 0.12 + midBand * 0.3 + ink * 0.1, 0.0, 1.0) * edge * uMood.w;
    vec3 c2 = mix(vec3(0.1, 0.06, 0.04), vec3(0.34, 0.21, 0.13), shadowBand);
    c2 = mix(c2, vec3(0.9, 0.75, 0.55), midBand);
    c2 = mix(c2, vec3(1.0, 0.96, 0.86), lightBand);
    c2 = mix(c2, vec3(0.13, 0.07, 0.04), ink * 0.7);
    float under = 1.0 - smoothstep(-1.0, 0.25, l.y);
    c2 = mix(c2, vec3(1.0, 0.66, 0.34), under * flick * (0.18 + 0.5 * midBand));
    c2 += vec3(1.0, 0.8, 0.5) * exp(-dist * 2.6) * 0.14 * flick;
    c2 += vec3(1.0, 0.82, 0.55) * smoothstep(0.7, 0.98, dist) * midBand * 0.25;
    float escaped = smoothstep(.9, 1.05, dist) * (1.0 - smoothstep(1.05, 1.5, dist));
    escaped *= smoothstep(-.1, .65, l.y) * smoothstep(.72, .96, fil2) * .3;
    c2 = mix(c2, vec3(0.88, 0.76, 0.6), step(1.0, dist));
    float oa = clamp(max(inside, escaped), 0.0, 0.92);
    vec3 pm = c2 * oa + col * a * (1.0 - oa);
    a = oa + a * (1.0 - oa);
    col = pm / max(a, 0.0001);
  }
  gl_FragColor = vec4(col * a, a);
}`;
