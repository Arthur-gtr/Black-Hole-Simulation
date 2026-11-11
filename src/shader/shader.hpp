
#pragma once
#include <vec3.hpp>
#include <string>

class Shader {
private:
  unsigned int _id;
  std::string readShaderFile(const std::string &filepath);
  unsigned int createShaderProgram(const char *vertexSource,
                                   const char *fragmentSource);

  public:
    Shader(const std::string &vertexPath, const std::string &fragmentPath);
    ~Shader();

    Shader(const Shader&) = delete;
    Shader& operator=(const Shader&) = delete;

    const inline unsigned int getId(){return _id;};

  void bind() const;
  void unbind() const;

  void setFloat(const std::string &name, float value) const;
  void setInt(const std::string &name, int value) const;
  void setVec3(const std::string &name, const Vec3 &value) const;
};