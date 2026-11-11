#pragma once

#include "vec3.hpp"

class Camera {
public:
    Vec3 pos;
    Vec3 dir;
    Vec3 forward;
    Vec3 right;
    Vec3 up;

    float fov = 30.0f;
    double distance = 540.0;

    int width = 1280;
    int height = 720;

    Camera(Vec3 startPos = Vec3(0.0f, 0.0f, 10.0f), Vec3 target = Vec3(0.0f, 0.0f, 0.0f))
        : pos(startPos)
    {
        dir = target - pos;
        setupCam();
    }

    void setupCam() {
        forward = normalize(dir);

        Vec3 worldUp(0.0f, 1.0f, 0.0f);

        if (std::abs(forward.y) > 0.999f) {
            worldUp = Vec3(0.0f, 0.0f, -1.0f);
        }

        right = normalize(cross(forward, worldUp));

        up = normalize(cross(right, forward));
    }
};