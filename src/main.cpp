#include "window.hpp"
#include "shader.hpp"
#include "camera.hpp"
#include "gameEngine.hpp"

#include <cmath>
#include <memory>

class BlackHoleApp {
private:
    std::unique_ptr<Window> window;
    std::unique_ptr<Shader> shader;

    Camera camera;
    unsigned int VAO = 0;
    unsigned int VBO = 0;

public:
    void onLoad() {
        window = std::make_unique<Window>(1280, 720, "Black hole simulation");

        shader = std::make_unique<Shader>("src/shader/raytracer.vert", "src/shader/raytracer.frag");

        float vertices[] = {
            -1.0f, -1.0f,  1.0f, -1.0f, -1.0f,  1.0f,
             1.0f,  1.0f, -1.0f,  1.0f,  1.0f, -1.0f
        };

        glGenVertexArrays(1, &VAO);
        glGenBuffers(1, &VBO);
        glBindVertexArray(VAO);
        glBindBuffer(GL_ARRAY_BUFFER, VBO);
        glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);
        glVertexAttribPointer(0, 2, GL_FLOAT, GL_FALSE, 2 * sizeof(float), (void*)0);
        glEnableVertexAttribArray(0);

        camera.distance = 20.0;
    }

    bool shouldContinue() {
        return window->isOpen();
    }

    void onUpdate(float dt) {
        if (glfwGetKey(window->_window.get(), GLFW_KEY_ESCAPE) == GLFW_PRESS) {
            window->close();
        }

       float time = glfwGetTime();

        float camX = std::sin(time * 0.02f) * camera.distance;
        float camZ = std::cos(time * 0.02f) * camera.distance;

        float camY = 1.0f; 

        camera.pos = Vec3(camX, camY, camZ);
        camera.dir = Vec3(0.0f, 0.0f, 0.0f) - camera.pos;
        camera.setupCam();

        shader->bind();
        shader->setFloat("u_time", time);

        glUniform2f(glGetUniformLocation(shader->getId(), "u_resolution"), 
                    (float)window->width, (float)window->height);

        shader->setVec3("u_cameraPos", camera.pos);
        shader->setVec3("u_cameraForward", camera.forward);
        shader->setVec3("u_cameraRight", camera.right);
        shader->setVec3("u_cameraUp", camera.up);

        glBindVertexArray(VAO);
        glDrawArrays(GL_TRIANGLES, 0, 6);

        window->update();
    }

    void onUnload() {
        glDeleteVertexArrays(1, &VAO);
        glDeleteBuffers(1, &VBO);

    }
};

int main() {
    rtk::GameEngine engine;

    engine.setFPS(30);

    BlackHoleApp app;
    return engine.run(app);
}