TARGET := riscv64imac-unknown-none-elf
BUILD_DIR := build/release
CLANG := $(shell bash scripts/find_clang)
AR := $(subst clang,llvm-ar,$(CLANG))

RUSTFLAGS := -C target-feature=+zba,+zbb,+zbc,+zbs \
             -C passes=lower-atomic \
             -C link-arg=-s

.PHONY: build clean test

build:
	@if [ -z "$(CLANG)" ]; then \
		echo "Error: Cannot find clang 16+. Please install clang."; \
		exit 1; \
	fi
	@echo "Building hash-lock contract with CC=$(CLANG)..."
	@mkdir -p $(BUILD_DIR)
	TARGET_CC="$(CLANG)" TARGET_AR="$(AR)" \
	RUSTFLAGS="$(RUSTFLAGS)" cargo build --target $(TARGET) --release -p hash-lock
	@cp target/$(TARGET)/release/hash-lock $(BUILD_DIR)/
	@echo "Build complete. Binary size: $$(wc -c < $(BUILD_DIR)/hash-lock) bytes"

test:
	@echo "Running tests..."
	cargo test -p tests

clean:
	cargo clean
	rm -rf build
