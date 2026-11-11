#version 330 core
out vec4 FragColor;

uniform vec2 u_resolution;
uniform float u_time;

uniform vec3 u_cameraPos;
uniform vec3 u_cameraForward;
uniform vec3 u_cameraRight;
uniform vec3 u_cameraUp;

vec3 getEnvironmentColor(vec3 dir) {
    vec3 color = vec3(0.0);

    float milkyWay = exp(-abs(dir.y) * 10.0); 
    color += vec3(0.01, 0.01, 0.015) * milkyWay;

    float starValue = sin(dir.x * 350.0) * sin(dir.y * 350.0) * sin(dir.z * 350.0);

    if (starValue > 0.99) {
        float intensity = smoothstep(0.99, 1.0, starValue);
        color += vec3(0.4, 0.5, 0.6) * intensity * 0.3;
    }

    return color;
}

vec3 calc_accel(vec3 pos, vec3 vel) {
    vec3 h = cross(pos, vel);
    float h2 = dot(h, h);
    float r2 = dot(pos, pos);
    float r5 = r2 * r2 * sqrt(r2);

    return -1.5 * h2 * pos / r5;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;

    vec3 p = u_cameraPos;
    vec3 v = normalize(u_cameraForward + uv.x * u_cameraRight + uv.y * u_cameraUp);

    vec3 color = vec3(0.0);
    float dt = 0.05;
    
    bool fell_in = false; 

    for(int i = 0; i < 400; i++) { 
        float r = length(p);

        if (r < 1.0) {
            fell_in = true;
            color = vec3(0.0);
            break;
        }

        if (p.y * (p.y - v.y * dt) < 0.0 && r > 2.0 && r < 6.0) {
            float gasSpeed = 1.5 / sqrt(r);
            vec3 diskVel = normalize(vec3(-p.z, 0.0, p.x)) * gasSpeed;

            float dopplerFactor = 1.0 + dot(v, diskVel);
            float beaming = pow(dopplerFactor, 3.0);

            vec3 baseColor = mix(vec3(1.0, 0.3, 0.0), vec3(1.0, 0.9, 0.7), dopplerFactor * 0.5);

            float angle = atan(p.z, p.x);
            float currentAngle = angle + u_time * gasSpeed * 2.0;

            float noise = sin(r * 15.0 - currentAngle * 4.0) * 0.5 + 0.5;
            float noise2 = sin(r * 30.0 + currentAngle * 7.0) * 0.5 + 0.5;
            float turbulence = noise * 0.7 + noise2 * 0.3;

            float edgeFade = smoothstep(6.0, 4.0, r) * smoothstep(2.0, 2.5, r);

            color += baseColor * turbulence * beaming * edgeFade * 0.8;
        }

        vec3 k1_v = calc_accel(p, v) * dt;
        vec3 k1_p = v * dt;

        vec3 k2_v = calc_accel(p + k1_p*0.5, v + k1_v*0.5) * dt;
        vec3 k2_p = (v + k1_v*0.5) * dt;

        vec3 k3_v = calc_accel(p + k2_p*0.5, v + k2_v*0.5) * dt;
        vec3 k3_p = (v + k2_v*0.5) * dt;

        vec3 k4_v = calc_accel(p + k3_p, v + k3_v) * dt;
        vec3 k4_p = (v + k3_v) * dt;

        p += (k1_p + 2.0*k2_p + 2.0*k3_p + k4_p) / 6.0;
        v += (k1_v + 2.0*k2_v + 2.0*k3_v + k4_v) / 6.0;

        v = normalize(v);

        if (r > 15.0) {
            break;
        }
    }

    if (!fell_in) {
        color += getEnvironmentColor(v);
    }

    float a = 2.51f;
    float b = 0.03f;
    float c = 2.43f;
    float d = 0.59f;
    float e = 0.14f;
    vec3 mappedColor = clamp((color * (a * color + b)) / (color * (c * color + d) + e), 0.0, 1.0);

    FragColor = vec4(pow(mappedColor, vec3(1.0/2.2)), 1.0);
}