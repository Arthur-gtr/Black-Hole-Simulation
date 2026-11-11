#version 330 core
out vec4 FragColor;

uniform vec2 u_resolution;
uniform float u_time;

uniform vec3 u_cameraPos;
uniform vec3 u_cameraForward;
uniform vec3 u_cameraRight;
uniform vec3 u_cameraUp;

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

    for(int i = 0; i < 300; i++) {
        float r = length(p);

        if (r < 1.0) {
            color = vec3(0.0);
            break;
        }

        if (p.y * (p.y - v.y * dt) < 0.0 && r > 2.0 && r < 6.0) {
            float intensity = 1.0 - (r - 2.0) / 4.0;
            color += vec3(1.0, 0.4, 0.1) * intensity * 0.5;
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

        if (r > 20.0) {
            float grid = mod(floor(v.x * 10.0) + floor(v.y * 10.0) + floor(v.z * 10.0), 2.0);
            vec3 spaceColor = mix(vec3(0.01, 0.01, 0.05), vec3(0.1, 0.1, 0.2), grid);
            color += spaceColor;
            break;
        }
    }

    color = color / (color + vec3(1.0));
    FragColor = vec4(pow(color, vec3(1.0/2.2)), 1.0);
}