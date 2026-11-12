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
    for (int i = 0; i < 4; i++) {
        v += a * noise(p);
        p *= 2.02;
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

vec3 shadeDisk(vec3 hitPos, vec3 rayDir, float r) {
    float beta = sqrt(0.5 / max(r - 1.0, 0.5)); 
    vec3 diskVelDir = normalize(vec3(-hitPos.z, 0.0, hitPos.x));

    float gamma = 1.0 / sqrt(max(1.0 - beta * beta, 0.01));
    float doppler = 1.0 / (gamma * (1.0 + beta * dot(rayDir, diskVelDir)));
    float gravRedshift = sqrt(max(1.0 - 1.0 / r, 0.01));

    float g = doppler * gravRedshift;

    float beaming = pow(clamp(g, 0.2, 2.5), 3.2);

    vec3 coldColor = vec3(0.8, 0.15, 0.02); 
    vec3 midColor  = vec3(1.0, 0.65, 0.25);
    vec3 hotColor  = vec3(0.85, 0.92, 1.0);
    
    vec3 baseColor = mix(coldColor, midColor, smoothstep(0.5, 1.0, g));
    baseColor = mix(baseColor, hotColor, smoothstep(1.0, 1.6, g));

    float angle = atan(hitPos.z, hitPos.x);
    float angularSpeed = 1.5 / pow(r, 1.5);
    float rotAngle = angle + u_time * angularSpeed;

    vec2 uvDisk = vec2(r * 2.5, rotAngle * 2.0 + r * 3.0);
    float n1 = fbm(vec2(r * 3.0, sin(rotAngle) * 3.0 + r * 2.0));
    float n2 = fbm(vec2(r * 6.0, cos(rotAngle) * 3.0 - r * 4.0));
    float rings = sin(r * 18.0 + n1 * 4.0) * 0.5 + 0.5;

    float density = mix(n1 * 0.6 + n2 * 0.4, rings, 0.45);
    density = smoothstep(0.15, 0.85, density);

    float innerEdge = smoothstep(1.8, 2.6, r);
    float outerEdge = smoothstep(9.0, 3.5, r);
    float radialProfile = innerEdge * outerEdge;

    return baseColor * density * beaming * radialProfile * 2.2;
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

    for(int i = 0; i < 700; i++) {
        float r = length(p);
        min_r = min(min_r, r);

        if (r <= 1.02) {
            fell_in = true;
            break;
        }

        float dt = clamp(0.02 * (r - 0.8), 0.01, 0.25);

        vec3 k1_v = calc_accel(p, h2) * dt;
        vec3 k1_p = v * dt;

        vec3 k2_v = calc_accel(p + k1_p * 0.5, h2) * dt;
        vec3 k2_p = (v + k1_v * 0.5) * dt;

        vec3 k3_v = calc_accel(p + k2_p * 0.5, h2) * dt;
        vec3 k3_p = (v + k2_v * 0.5) * dt;

        vec3 k4_v = calc_accel(p + k3_p, h2) * dt;
        vec3 k4_p = (v + k3_v) * dt;

        vec3 next_p = p + (k1_p + 2.0 * k2_p + 2.0 * k3_p + k4_p) / 6.0;
        vec3 next_v = v + (k1_v + 2.0 * k2_v + 2.0 * k3_v + k4_v) / 6.0;

        if (p.y * next_p.y < 0.0) {
            float t = abs(p.y) / (abs(p.y) + abs(next_p.y));
            vec3 hitPos = mix(p, next_p, t);
            float hitR = length(hitPos);

            if (hitR > 1.8 && hitR < 9.0) {
                vec3 diskLight = shadeDisk(hitPos, normalize(v), hitR);

                float alpha = clamp(length(diskLight) * 0.35, 0.0, 0.85);
                accumColor += transmittance * diskLight;
                transmittance *= (1.0 - alpha);

                if (transmittance < 0.01) break;
            }
        }

        p = next_p;
        v = next_v;

        if (r > 25.0 && dot(p, v) > 0.0) {
            break;
        }
    }

    if (!fell_in) {
        accumColor += transmittance * getEnvironmentColor(normalize(v));
    }

    float photonRing = exp(-abs(min_r - 1.5) * 18.0);
    accumColor += vec3(1.0, 0.75, 0.4) * photonRing * 0.25 * transmittance;

    float a = 2.51f;
    float b = 0.03f;
    float c = 2.43f;
    float d = 0.59f;
    float e = 0.14f;
    vec3 mappedColor = clamp((accumColor * (a * accumColor + b)) / (accumColor * (c * accumColor + d) + e), 0.0, 1.0);

    FragColor = vec4(pow(mappedColor, vec3(1.0 / 2.2)), 1.0);
}