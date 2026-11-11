#pragma once

#include <Logger/Logger.hpp>
#include <algorithm>
#include <chrono>
#include <string>
#include <thread>
#include <concepts>

namespace rtk {

/**
 * @brief Manages the main loop and FPS capping.
 */
class GameEngine {
public:
  using Clock = std::chrono::steady_clock;

  GameEngine() = default;
  ~GameEngine() = default;

  /**
   * @brief Requests the loop to stop after the current frame.
   */
  void stop() { _running = false; }

  /**
   * @brief Sets the FPS limit.
   * @param fps Frames per second, 0 for no limit.
   */
  void setFPS(uint32_t fps) { _targetFps = fps; }

  /**
   * @brief Runs the game and executes the frames.
   *
   * @param game Game instance to run.
   * @return 0 when the loop finishes normally.
   */
  template <typename TGame> 
  int run(TGame &game) {
    if constexpr (requires { game.onLoad(); }) {
      game.onLoad();
    }

    _running = true;

    auto currentTime = Clock::now();
    auto nextFrameTarget = currentTime;

    float accumulator = 0.0f;
    const float fixedDeltaTime = 1.0f / 60.0f;

    try {
      while (_running) {
        if constexpr (requires { { game.shouldContinue() } -> std::convertible_to<bool>; }) {
          if (!game.shouldContinue())
            break;
        }

        auto newTime = Clock::now();
        float realDeltaTime = std::chrono::duration<float>(newTime - currentTime).count();
        currentTime = newTime;

        float frameTime = std::min(realDeltaTime, 0.25f);
        accumulator += frameTime;

        while (accumulator >= fixedDeltaTime) {
          accumulator -= fixedDeltaTime;
        }

        if constexpr (requires { game.onUpdate(frameTime); }) {
          game.onUpdate(frameTime);
        }

        updateFPS(realDeltaTime);

        if (_targetFps > 0) {
          const auto targetDuration = std::chrono::nanoseconds(1000000000 / _targetFps);
          nextFrameTarget += targetDuration;

          auto sleepStart = Clock::now();

          if (nextFrameTarget > sleepStart) {
            auto timeToSleep = nextFrameTarget - sleepStart;

            if (timeToSleep > std::chrono::milliseconds(2))
              std::this_thread::sleep_for(timeToSleep - std::chrono::milliseconds(2));

            while (Clock::now() < nextFrameTarget) {
            }
          } else {
            nextFrameTarget = Clock::now();
          }
        }
      }
    } catch (...) {
      throw;
    }

    if constexpr (requires { game.onUnload(); }) {
      game.onUnload();
    }

    return 0;
  }

private:
  void updateFPS(float realDeltaTime) {
    _fpsTimer += realDeltaTime;
    _fpsFrames++;
    if (_fpsTimer >= 1.0f) {
      LOG_DEBUG("FPS: " + std::to_string(_fpsFrames));
      _fpsTimer -= 1.0f;
      _fpsFrames = 0;
    }
  }

  bool _running = false;
  uint32_t _targetFps = 0;

  float _fpsTimer = 0.0f;
  int _fpsFrames = 0;
};

} // namespace rtk