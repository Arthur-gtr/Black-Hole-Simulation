ifndef VCPKG_ROOT
$(error "VCPKG_ROOT Undefined")
endif

all:
	@mkdir -p build bin
	$(VCPKG_ROOT)/vcpkg install
	cmake -S . -B build \
		-DCMAKE_RUNTIME_OUTPUT_DIRECTORY=$(CURDIR)/bin \
		-DCMAKE_TOOLCHAIN_FILE="$(VCPKG_ROOT)/scripts/buildsystems/vcpkg.cmake"
	cmake --build build

clean:
	rm -rf build

fclean: clean
	rm -rf bin vcpkg_installed

re: fclean all

.PHONY: all clean fclean re
.PARALLEL: