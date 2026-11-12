#pragma once

#include <iostream>
#include <string>
#include <memory>

#include <glad/glad.h>
#include <GLFW/glfw3.h>

#include "Logger.hpp"

struct WindowDeleter {
    void operator()(GLFWwindow* window) const {
        if (window) {
            glfwDestroyWindow(window);
        }
    }
};

class Window {
public:
    std::unique_ptr<GLFWwindow, WindowDeleter> _window;
    int width;
    int height;

    Window(int w, int h, const std::string& title) : width(w), height(h) {
        if (!glfwInit()) {
            LOG_ERROR("Error while initializing GLFW");
            return;
        }

        glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
        glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
        glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);

        GLFWmonitor* monitor = glfwGetPrimaryMonitor();

        const GLFWvidmode* mode = glfwGetVideoMode(monitor);

        _window.reset(glfwCreateWindow(mode->width, mode->height, title.c_str(), monitor, nullptr));

        if (!_window) {
            LOG_ERROR("Error with the window creation");
            glfwTerminate();
            return;
        }

        glfwMakeContextCurrent(_window.get());

        glfwSetWindowUserPointer(_window.get(), this);
        glfwSetFramebufferSizeCallback(_window.get(), [](GLFWwindow* w, int w_w, int w_h) {
            glViewport(0, 0, w_w, w_h);
            Window* win = static_cast<Window*>(glfwGetWindowUserPointer(w));
            if (win) {
                win->width = w_w;
                win->height = w_h;
            }
        });

        if (!gladLoadGLLoader((GLADloadproc)glfwGetProcAddress)) {
            LOG_ERROR("Error: initialization of GLAD failed");
        }
    }

    ~Window() {
        glfwTerminate();
    }

    bool isOpen() const {
        return _window && !glfwWindowShouldClose(_window.get());
    }

    void close() {
        if (_window) {
            glfwSetWindowShouldClose(_window.get(), true);
        }
    }

    void update() {
        if (_window) {
            glfwSwapBuffers(_window.get());
            glfwPollEvents();
        }
    }
};