#version 330 core
out vec4 FragColor;

uniform vec2 u_resolution;
uniform float u_time;

uniform vec3 u_cameraPos;
uniform vec3 u_cameraForward;
uniform vec3 u_cameraRight;
uniform vec3 u_cameraUp;

float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 3; i++) {
        v += a * noise(p);
        p *= 2.03;
        a *= 0.5;
    }
    return v;
}

vec3 getEnvironmentColor(vec3 dir) {
    vec3 color = vec3(0.0);

    float milkyWay = exp(-abs(dir.y * 4.0 + dir.x * 0.5));
    float dust = fbm(dir.xz * 6.0);
    color += vec3(0.04, 0.03, 0.05) * milkyWay * (0.5 + 0.5 * dust);

    float starValue = sin(dir.x * 350.0) * sin(dir.y * 350.0) * sin(dir.z * 350.0);
    if (starValue > 0.92) {
        float intensity = smoothstep(0.985, 1.0, starValue);
        color += vec3(0.7, 0.8, 1.0) * intensity * 15.0;
    }

    return color;
}

vec3 calc_accel(vec3 pos, float h2) {
    float r2 = dot(pos, pos);
    float r5 = r2 * r2 * sqrt(r2);
    return -1.5 * h2 * pos / max(r5, 0.0001);
}

void sampleGasVolume(vec3 p, vec3 rayDir, float r, float dt, inout vec3 accumColor, inout float transmittance) {
    float diskHalfHeight = 0.12 + 0.035 * (r - 2.0);
    float normY = abs(p.y) / diskHalfHeight;

    if (normY >= 1.0)
        return;

    float spiralPhase = u_time * 1.5 / pow(r, 1.2) - r * 1.6;
    float s = sin(spiralPhase);
    float c = cos(spiralPhase);
    vec2 rotXZ = vec2(c * p.x - s * p.z, s * p.x + c * p.z);

    float n1 = fbm(rotXZ * 1.3 + vec2(p.y * 5.0, -p.y * 5.0));
    float n2 = fbm(rotXZ * 2.8 - vec2(p.y * 10.0, u_time * 0.4));

    float rings = sin(r * 14.0 + n1 * 6.0) * 0.5 + 0.5;
    float clouds = n1 * 0.55 + n2 * 0.45;

    float verticalFade = exp(-normY * normY * 3.5) * (1.0 - normY);
    float radialFade = smoothstep(2.0, 2.9, r) * smoothstep(9.0, 4.0, r);

    float density = smoothstep(0.28, 0.85, mix(clouds, rings, 0.45));
    density *= verticalFade * radialFade;

    if (density < 0.005) return;

    float beta = sqrt(0.5 / max(r - 1.0, 0.5));
    vec3 diskVelDir = normalize(vec3(-p.z, 0.0, p.x));
    float gamma = 1.0 / sqrt(max(1.0 - beta * beta, 0.01));
    float doppler = 1.0 / (gamma * (1.0 + beta * dot(rayDir, diskVelDir)));
    float gravRedshift = sqrt(max(1.0 - 1.0 / r, 0.01));

    float g = doppler * gravRedshift;
    float beaming = pow(clamp(g, 0.2, 2.5), 3.2);

    float coreHeat = exp(-normY * 2.5);
    vec3 coldSmoke = vec3(0.5, 0.08, 0.01);
    vec3 midGold   = vec3(1.0, 0.55, 0.15);
    vec3 hotCore   = vec3(0.9, 0.95, 1.0);

    vec3 baseColor = mix(coldSmoke, midGold, smoothstep(0.4, 1.0, g * (0.6 + 0.4 * coreHeat)));
    baseColor = mix(baseColor, hotCore, smoothstep(1.0, 1.65, g * coreHeat));

    float sigma_a = 4.5;
    float stepAlpha = 1.0 - exp(-density * dt * sigma_a);

    vec3 emission = baseColor * beaming * 2.8;
    accumColor += transmittance * emission * stepAlpha;
    transmittance *= (1.0 - stepAlpha);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;

    vec3 p = u_cameraPos;
    vec3 v = normalize(u_cameraForward + uv.x * u_cameraRight + uv.y * u_cameraUp);

    vec3 h = cross(p, v);
    float h2 = dot(h, h);

    vec3 accumColor = vec3(0.0);
    float transmittance = 1.0;
    bool fell_in = false;
    float min_r = 1000.0;

    float dither = hash(gl_FragCoord.xy);
    p += v * dither * 0.03;

    for(int i = 0; i < 280; i++) {
        float r = length(p);
        min_r = min(min_r, r);

        if (r <= 1.02 || (r < 1.5 && dot(p, v) < 0.0)) {
            fell_in = true;
            break;
        }

        float dt = clamp(0.025 * (r - 0.8), 0.01, 0.25);

        if (r > 1.8 && r < 9.5) {
            float distToPlane = abs(p.y);
            dt = min(dt, max(0.025, distToPlane * 0.35));
        }

        if (r > 2.0 && r < 9.0 && abs(p.y) < 0.45) {
            sampleGasVolume(p, normalize(v), r, dt, accumColor, transmittance);
            if (transmittance < 0.01)
                break;
        }

        vec3 k1_v = calc_accel(p, h2) * dt;
        vec3 k1_p = v * dt;

        vec3 k2_v = calc_accel(p + k1_p * 0.5, h2) * dt;
        vec3 k2_p = (v + k1_v * 0.5) * dt;

        vec3 k3_v = calc_accel(p + k2_p * 0.5, h2) * dt;
        vec3 k3_p = (v + k2_v * 0.5) * dt;

        vec3 k4_v = calc_accel(p + k3_p, h2) * dt;
        vec3 k4_p = (v + k3_v) * dt;

        p += (k1_p + 2.0 * k2_p + 2.0 * k3_p + k4_p) / 6.0;
        v += (k1_v + 2.0 * k2_v + 2.0 * k3_v + k4_v) / 6.0;

        if (r > 25.0 && dot(p, v) > 0.0) {
            break;
        }
    }

    if (length(p) < 5.0 || dot(p, v) < 0.0) {
        fell_in = true;
    }

    if (!fell_in) {
        accumColor += transmittance * getEnvironmentColor(normalize(v));

        float photonRing = exp(-abs(min_r - 1.5) * 25.0);
        accumColor += vec3(1.0, 0.75, 0.4) * photonRing * 0.2 * transmittance;
    }

    float a = 2.51f;
    float b = 0.03f;
    float c = 2.43f;
    float d = 0.59f;
    float e = 0.14f;
    vec3 mappedColor = clamp((accumColor * (a * accumColor + b)) / (accumColor * (c * accumColor + d) + e), 0.0, 1.0);

    FragColor = vec4(pow(mappedColor, vec3(1.0 / 2.2)), 1.0);
}