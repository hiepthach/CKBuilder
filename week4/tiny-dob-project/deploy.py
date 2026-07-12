#!/usr/bin/env python3
import os
import sys
import subprocess

def main():
    config_path = "offckb.yaml"
    if not os.path.exists(config_path):
        print(f"Error: Configuration file '{config_path}' not found.")
        sys.exit(1)

    print(f"Reading deployment configurations from {config_path}...")
    config = {}
    with open(config_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if ":" in line:
                key, val = line.split(":", 1)
                config[key.strip()] = val.strip().strip('"').strip("'")

    network = config.get("network", "devnet")
    target = config.get("target", "./ckb-rust-script/build/release/tiny-dob-script")
    output = config.get("output", "./web/src/deployment")
    privkey = config.get("privkey")

    if not os.path.exists(target):
        print(f"Error: Target binary '{target}' does not exist. Did you compile the contract first using 'make build'?")
        sys.exit(1)

    cmd = [
        "offckb", "deploy",
        "--network", network,
        "--target", target,
        "--output", output
    ]
    if privkey:
        cmd.extend(["--privkey", privkey])
    
    cmd.append("-y")  # Skip yes/no prompt

    print(f"Executing: {' '.join(cmd)}")
    try:
        subprocess.run(cmd, check=True)
        print("\n✨ Deployment completed successfully!")
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Deployment failed with exit code: {e.returncode}")
        sys.exit(e.returncode)

if __name__ == "__main__":
    main()
