import { CONFIG } from "./scene-config.js";

export const vertexSource = `
  attribute vec2 a_position;
  void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;
export const fragmentSource = `
  precision highp float;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform sampler2D u_inner, u_middle, u_outer, u_script, u_land;
  const float PI = 3.14159265359;
  mat2 rot(float a) { float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec3 p) {
    vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    vec2 q = i.xy + vec2(37.0, 17.0) * i.z;
    return mix(mix(mix(hash(q), hash(q+vec2(1,0)), f.x),
                   mix(hash(q+vec2(0,1)), hash(q+vec2(1,1)), f.x), f.y),
               mix(mix(hash(q+vec2(37,17)), hash(q+vec2(38,17)), f.x),
                   mix(hash(q+vec2(37,18)), hash(q+vec2(38,18)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) {
    float v = 0.0, a = .5;
    for (int i = 0; i < 5; i++) { v += noise(p) * a; p = p * 2.07 + vec3(7.1, 3.7, 1.8); a *= .5; }
    return v;
  }
  vec3 engraving(sampler2D tex, vec2 p, float angle) {
    vec2 q = rot(angle) * p;
    vec2 uv = .5 + q * vec2(.5, -.5);
    float side = smoothstep(.24,.92,abs(p.x)/(u_resolution.x/u_resolution.y*.5));
    vec2 shift = q * (.00008 + side*side*${CONFIG.optics.edgeDispersion});
    // Sample the full visible spectrum rather than only three RGB offsets.
    vec3 ink = texture2D(tex,uv+shift).r*vec3(1.0,.03,0.0)
             + texture2D(tex,uv+shift*.67).r*vec3(1.0,.35,0.0)
             + texture2D(tex,uv+shift*.33).r*vec3(.9,1.0,0.0)
             + texture2D(tex,uv).r*vec3(0.0,1.0,.1)
             + texture2D(tex,uv-shift*.33).r*vec3(0.0,.8,1.0)
             + texture2D(tex,uv-shift*.67).r*vec3(.1,.1,1.0)
             + texture2D(tex,uv-shift).r*vec3(.55,0.0,1.0);
    ink /= vec3(3.55,3.28,3.1);
    float bloom = texture2D(tex, uv + vec2(.0016, 0)).r + texture2D(tex, uv - vec2(.0016,0)).r
                + texture2D(tex, uv + vec2(0,.0016)).r + texture2D(tex, uv - vec2(0,.0016)).r;
    return ink + bloom * vec3(.018, .038, .054);
  }
  float starLight(vec2 d, float edge) {
    // An anisotropic light footprint replaces pin-sharp copies at the sides.
    // Longitudinal stretching follows the curved particle coordinate field.
    vec2 softened = d / vec2(mix(1.0,2.8,edge),mix(1.0,7.0,edge));
    float core = exp(-dot(softened,softened)*1800000.0);
    float vertical = exp(-abs(softened.x)*2100.0-abs(d.y)*180.0);
    float horizontal = exp(-abs(d.x)*620.0-abs(d.y)*2200.0);
    vec2 diagonal = rot(.7854)*d;
    float sparkle = exp(-abs(diagonal.x)*2300.0-abs(diagonal.y)*800.0)
                  + exp(-abs(diagonal.y)*2300.0-abs(diagonal.x)*800.0);
    float behind = max(0.0,-d.y);
    float tailWidth = (1400.0+behind*28000.0)/mix(1.0,3.2,edge);
    float tail = exp(-abs(d.x)*tailWidth)*exp(-behind*mix(42.0,17.0,edge))
               * (1.0-smoothstep(0.0,.002,d.y))
               * (1.0-smoothstep(.055,.08,behind));
    float haze = exp(-dot(d/vec2(.004,.027),d/vec2(.004,.027)))*edge*.10;
    return core*mix(1.3,.85,edge)+vertical*.4
         + (horizontal*.25+sparkle*.10)*(1.0-edge*.8)
         + tail*mix(.42,.85,edge)+haze;
  }
  vec3 flare(vec2 p, float scale) {
    p /= scale;
    float d = length(p);
    float core = .000055 / (d*d + .000009);
    float halo = .23 * exp(-d * 10.0) + .055 * exp(-d * 4.5);
    float rays = 1.20 * exp(-abs(p.x)*450.0 - abs(p.y)*16.0)
               + .85 * exp(-abs(p.y)*650.0 - abs(p.x)*10.0);
    vec2 diagonal = rot(.7854) * p;
    rays += .48 * exp(-abs(diagonal.x)*650.0 - abs(diagonal.y)*70.0)
          + .48 * exp(-abs(diagonal.y)*650.0 - abs(diagonal.x)*70.0);
    return vec3(.25,.72,1.0) * (halo + rays + core) + vec3(1.0,.95,.78)*exp(-d*240.0)*3.5;
  }
  void main() {
    vec2 screen = gl_FragCoord.xy / u_resolution;
    float framing = mix(1.0, 1.45, 1.0 - smoothstep(.55, 1.25, u_resolution.x / u_resolution.y));
    vec2 p = (gl_FragCoord.xy - .5*u_resolution) / u_resolution.y * framing;
    p.y += .012;
    float r = length(p);
    float t = u_time;
    vec3 color = vec3(.003,.008,.012);
    color += vec3(.004,.018,.026) * exp(-r*r*2.0);
    // Distant, almost invisible stars and fine vertical motes.
    vec2 starGrid = p * 620.0;
    float star = step(.9987, hash(floor(starGrid))) * pow(max(0.0, 1.0-length(fract(starGrid)-.5)*2.0), 5.0);
    color += star * vec3(.09,.15,.18) * smoothstep(.27,.9,r);

    vec3 rings = engraving(u_inner, p, ${CONFIG.wheels.inner}*t)
               + engraving(u_middle, p, ${CONFIG.wheels.runes}*t)
               + engraving(u_outer, p, ${CONFIG.wheels.outer}*t)
               + engraving(u_script, p, ${CONFIG.wheels.script}*t);
    float topLight = smoothstep(-.50,.50,p.y);
    vec3 ringLight = mix(vec3(.018,.057,.073), vec3(.24,.46,.59), pow(topLight, 2.3));
    ringLight += vec3(.02,.09,.13) * exp(-length(p-vec2(0,.27))*4.0);
    float edgeSpectrum = smoothstep(.24,.92,abs(p.x)/(u_resolution.x/u_resolution.y*.5));
    ringLight = mix(ringLight,vec3(max(ringLight.b,.18)),edgeSpectrum*.9);
    color += rings * ringLight;

    // Spherical projection, with drifting cloud fields and raking polar light.
    float radius = .280;
    if (r < radius) {
      vec2 xy = p / radius;
      vec3 n = vec3(xy, sqrt(max(0.0, 1.0-dot(xy,xy))));
      vec3 surface = n;
      surface.yz = rot(-.22) * surface.yz;
      surface.xz = rot(.38 + t*.012) * surface.xz;
      vec2 uv = vec2(atan(surface.x, surface.z)/(2.0*PI)+.5, .5-asin(surface.y)/PI);
      float terrain = fbm(surface*22.0);
      float land = texture2D(u_land, uv + vec2(terrain-.5, noise(surface*19.0)-.5)*.006).r;
      float detail = fbm(surface*83.0);
      vec3 ocean = vec3(.003,.019,.032) + detail * vec3(.004,.018,.029);
      vec3 ground = mix(vec3(.012,.047,.063),vec3(.034,.095,.12),terrain) * (.55+detail);
      vec3 earth = mix(ocean, ground, land);
      vec3 cloudP = surface*6.5;
      cloudP.xz = rot(t*.005) * cloudP.xz;
      cloudP += vec3(fbm(surface*4.0), fbm(surface*4.0+20.0), 0.0)*1.6;
      float clouds = smoothstep(.47,.72,fbm(cloudP));
      float wisps = smoothstep(.48,.76,fbm(cloudP*2.8+5.0));
      clouds = clamp(clouds*.85 + wisps*.28, 0.0, 1.0);
      vec3 light = normalize(vec3(-.15,.94,.36));
      float diffuse = max(0.0,dot(n,light));
      earth *= .25 + diffuse*1.9;
      earth += clouds * vec3(.23,.44,.53) * (.045+pow(diffuse,3.0)*1.7);
      float fresnel = pow(1.0-n.z, 3.0);
      earth += vec3(.025,.27,.43)*fresnel*pow(diffuse,2.0)*.85;
      earth *= .45 + .55*smoothstep(-.24,.20,p.y);
      color = mix(color,earth,1.0-smoothstep(radius-.001,radius,r));
    }
    float rim = exp(-abs(r-radius)*900.0);
    color += rim * vec3(.04,.27,.41)*smoothstep(-.10,.25,p.y)*.55;
    color += vec3(.012,.06,.10)*exp(-abs(r-radius)*110.0)*smoothstep(.0,.27,p.y)*.35;
    color += flare(p-vec2(.005,.282),1.45)*(1.25+.09*sin(t*1.3));
    // Optical ghosts sit on the same vertical axis as the brilliant upper light.
    vec2 upperGhost = (p-vec2(.005,.344))*vec2(1.0,2.8);
    color += vec3(.005,.32,.34)*exp(-dot(upperGhost,upperGhost)*270.0);
    float haloRadius = length(p-vec2(.005,.28));
    float haloDistance = (haloRadius-${CONFIG.halo.radius})*float(${CONFIG.halo.width});
    float haloArc = exp(-haloDistance*haloDistance);
    float outerHaloDistance = (haloRadius-.142)*125.0;
    color += haloArc*vec3(.025,.29,.39)*mix(.45,1.0,smoothstep(.23,.40,p.y));
    color += exp(-outerHaloDistance*outerHaloDistance)*vec3(.055,.055,.17)*.65;
    // Parabolic paths sweep inward as they rise. Applying the same inverse
    // warp to the heads and trails makes both follow the continuous curve.
    float curveY = min(p.y-.38,0.0);
    float flowWidth = .62+.85*curveY*curveY;
    vec2 particleSpace = vec2(p.x/flowWidth, p.y);
    float column = floor(particleSpace.x * float(${CONFIG.stars.columns}));
    float speed = mix(${CONFIG.stars.minSpeed}, ${CONFIG.stars.maxSpeed}, hash(vec2(column, 9.0)));
    // Independent starting phases prevent synchronized rows on the first frame.
    float startPhase = hash(vec2(column, 47.3))*23.0;
    vec2 field = vec2(particleSpace.x * float(${CONFIG.stars.columns}), (particleSpace.y - t * speed) * float(${CONFIG.stars.rows})+startPhase);
    vec2 cell = floor(field);
    vec2 local = fract(field);
    vec2 center = vec2(.18 + .64*hash(cell+3.0), .42+.23*hash(cell+12.0));
    vec2 delta = (local-center) / vec2(float(${CONFIG.stars.columns}),float(${CONFIG.stars.rows}));
    float alive = step(${CONFIG.stars.density},hash(cell+21.0));
    float twinkle = .5+.5*sin(t*(2.2+hash(cell+7.0)*2.0)+hash(cell)*6.28);
    float pulse = 1.05 + .55*pow(twinkle,4.0);
    // Disperse the whole star, including its rays and curved tail, into
    // seven spectral images. The center stays aligned; the sides separate.
    float sideFringe = smoothstep(.18,.92,abs(p.x)/(u_resolution.x/u_resolution.y*.5));
    // Most dispersion runs along the trajectory; a small transverse shift
    // leaves colored rims instead of isolated parallel star duplicates.
    vec2 split = vec2(.0012*sign(p.x)/flowWidth,.012)*sideFringe*sideFringe;
    vec3 starSpectrum = starLight(delta-split,sideFringe)*vec3(1.0,.03,0.0)
                      + starLight(delta-split*.67,sideFringe)*vec3(1.0,.35,0.0)
                      + starLight(delta-split*.33,sideFringe)*vec3(.9,1.0,0.0)
                      + starLight(delta,sideFringe)*vec3(0.0,1.0,.1)
                      + starLight(delta+split*.33,sideFringe)*vec3(0.0,.8,1.0)
                      + starLight(delta+split*.67,sideFringe)*vec3(.1,.1,1.0)
                      + starLight(delta+split,sideFringe)*vec3(.55,0.0,1.0);
    starSpectrum /= vec3(3.55,3.28,3.1);
    starSpectrum *= mix(vec3(.74,.92,.94),vec3(1.18),sideFringe);
    float starGlow = exp(-dot(delta,delta)*95000.0);
    color += (starSpectrum+vec3(.05,.16,.24)*starGlow)*alive*pulse;
    // A faint spectral lens reflection near the bottom of the frame.
    vec2 ghost = p - vec2(.008,-.46);
    color += exp(-dot(ghost*vec2(8.0,22.0),ghost*vec2(8.0,22.0))) * vec3(.065,.031,.007);
    color += exp(-dot((ghost+vec2(0,.026))*vec2(10.0,35.0),(ghost+vec2(0,.026))*vec2(10.0,35.0))) * vec3(.005,.025,.017);
    float vignette = 1.0 - .42*smoothstep(.25,1.15,length(p*vec2(.78,1.0)));
    color *= vignette * mix(.48,1.0,smoothstep(-.52,.05,p.y));
    // A single blue photographic grade covers geometry, particles, and optics.
    float highlight = smoothstep(.7,2.3,max(color.r,max(color.g,color.b)));
    color = mix(color*vec3(.60,.87,1.16)+vec3(.002,.009,.023),color,max(highlight*.8,edgeSpectrum*.9));
    color = pow(max(color,0.0), vec3(.87));
    // Aged film texture: coarse emulsion, fine grain, and restrained wear.
    float grainFrame = mod(floor(t*24.0),97.0);
    float fineGrain = hash(gl_FragCoord.xy+grainFrame)-.5;
    float softGrain = hash(floor(gl_FragCoord.xy/2.0)+grainFrame*1.73)-.5;
    float grain = fineGrain*.55+softGrain*.45;
    float grainStrength = mix(1.0,.5,smoothstep(.25,.8,max(color.r,max(color.g,color.b))));
    float flicker = 1.0+(hash(vec2(grainFrame,83.0))-.5)*.025;
    color *= flicker;
    color += grain*vec3(.060,.073,.088)*grainStrength*float(${CONFIG.film.grain})+vec3(.001,.002,.004);
    // Sparse dust flecks change with the film frames.
    vec2 dustCell = floor(gl_FragCoord.xy/3.0);
    float dust = step(.9994,hash(dustCell+grainFrame*3.7));
    vec2 dustLocal = fract(gl_FragCoord.xy/3.0)-.5;
    dust *= exp(-dot(dustLocal,dustLocal)*15.0);
    color *= 1.0-dust*.35;
    // An intermittent hairline scratch drifts slightly across the image.
    float scratchTime = floor(t*1.4);
    float scratchX = hash(vec2(scratchTime,41.0))+.001*sin(t*2.0);
    float scratch = exp(-abs(screen.x-scratchX)*u_resolution.x*1.4);
    scratch *= step(.65,hash(vec2(scratchTime,18.0)));
    scratch *= .35+.65*noise(vec3(screen.y*14.0,t*.8,3.0));
    color += scratch*vec3(.018,.023,.028);
    color = max(color,0.0);
    gl_FragColor = vec4(color,1.0);
  }
`;
