#pragma once

#ifdef _WIN32
#include <GL/glew.h>
#define NOMINMAX
#include <windows.h>
#else
#ifdef __APPLE__
#include <OpenGL/gl3.h>
#else
#define GL_GLEXT_PROTOTYPES 1
#include <GL/gl.h>
#endif
#endif