{
    "variables": {
        "packaging": "<!(echo $PACKAGING)"
    },
    "conditions": [
        ["packaging!=1", {
            "targets": [
                {
                    "target_name": "krypton_node_native",
                    "sources": [
                        "src/native/argon2.c",
                        "src/native/blake2/blake2b.c",
                        "src/native/core.c",
                        "src/native/encoding.c",
                        "src/native/krypton_native.c",
                        "src/native/sha256.c",
                        "src/native/sha512.c",
                        "src/native/ripemd160.c",
                        "src/native/keccak.c",
                        "src/native/util.c",
                        "src/native/ed25519/collective.c",
                        "src/native/ed25519/fe.c",
                        "src/native/ed25519/ge.c",
                        "src/native/ed25519/keypair.c",
                        "src/native/ed25519/memory.c",
                        "src/native/ed25519/sc.c",
                        "src/native/ed25519/sign.c",
                        "src/native/ed25519/verify.c",
                        "src/native/secp256k1/precomputed_ecmult_gen.c",
                        "src/native/secp256k1/precomputed_ecmult.c",
                        "src/native/secp256k1/secp256k1.c",
                        "src/native/secp256k1_native.c",
                        "src/native/krypton_node.cc"
                    ],
                    'conditions': [
                        ["target_arch=='x64'", {"sources": ["src/native/opt.c"]}],
                        ["target_arch!='x64'", {"sources": ["src/native/ref.c"]}],
                        ["OS=='mac' and target_arch=='arm64'", {"xcode_settings": {"OTHER_CFLAGS": ["-march=armv8.5-a"]} }],
                        ["OS=='mac' and target_arch!='arm64'", {"xcode_settings": {"OTHER_CFLAGS": ["-march=native"]} }],
                    ],
                    "defines": [
                        "ARGON2_NO_THREADS"
                    ],
                    "include_dirs": [
                        "<!(node -e \"require('nan')\")",
                        "src/native"
                    ],
                    "cflags_c": [
                        "-std=c99",
                        "-march=native"
                    ],
                },
            ]
        }],
        ["packaging==1", {
            "targets": [
                {
                    "target_name": "krypton_node_compat",
                    "sources": [
                        "src/native/argon2.c",
                        "src/native/blake2/blake2b.c",
                        "src/native/core.c",
                        "src/native/encoding.c",
                        "src/native/krypton_native.c",
                        "src/native/ref.c",
                        "src/native/sha256.c",
                        "src/native/sha512.c",
                        "src/native/ripemd160.c",
                        "src/native/keccak.c",
                        "src/native/util.c",
                        "src/native/ed25519/collective.c",
                        "src/native/ed25519/fe.c",
                        "src/native/ed25519/ge.c",
                        "src/native/ed25519/keypair.c",
                        "src/native/ed25519/memory.c",
                        "src/native/ed25519/sc.c",
                        "src/native/ed25519/sign.c",
                        "src/native/ed25519/verify.c",
                        "src/native/secp256k1/precomputed_ecmult_gen.c",
                        "src/native/secp256k1/precomputed_ecmult.c",
                        "src/native/secp256k1/secp256k1.c",
                        "src/native/secp256k1_native.c",
                        "src/native/krypton_node.cc"
                    ],
                    "defines": [
                        "ARGON2_NO_THREADS"
                    ],
                    "include_dirs": [
                        "<!(node -e \"require('nan')\")",
                        "src/native"
                    ],
                    "cflags_c": [
                        "-std=c99",
                        "-mtune=generic"
                    ],
                    "xcode_settings": {
                        "OTHER_CFLAGS": [
                            "-mtune=generic"
                        ]
                    }
                },
                {
                    "target_name": "krypton_node_sse2",
                    "sources": [
                        "src/native/argon2.c",
                        "src/native/blake2/blake2b.c",
                        "src/native/core.c",
                        "src/native/encoding.c",
                        "src/native/krypton_native.c",
                        "src/native/ref.c",
                        "src/native/sha256.c",
                        "src/native/sha512.c",
                        "src/native/ripemd160.c",
                        "src/native/keccak.c",
                        "src/native/util.c",
                        "src/native/ed25519/collective.c",
                        "src/native/ed25519/fe.c",
                        "src/native/ed25519/ge.c",
                        "src/native/ed25519/keypair.c",
                        "src/native/ed25519/memory.c",
                        "src/native/ed25519/sc.c",
                        "src/native/ed25519/sign.c",
                        "src/native/ed25519/verify.c",
                        "src/native/secp256k1/precomputed_ecmult_gen.c",
                        "src/native/secp256k1/precomputed_ecmult.c",
                        "src/native/secp256k1/secp256k1.c",
                        "src/native/secp256k1_native.c",
                        "src/native/krypton_node.cc"
                    ],
                    "defines": [
                        "ARGON2_NO_THREADS"
                    ],
                    "include_dirs": [
                        "<!(node -e \"require('nan')\")",
                        "src/native"
                    ],
                    "cflags_c": [
                        "-std=c99",
                        "-msse",
                        "-msse2",
                    ],
                    "xcode_settings": {
                        "OTHER_CFLAGS": [
                            "-msse",
                            "-msse2",
                        ]
                    }
                },
                {
                    "target_name": "krypton_node_avx",
                    "sources": [
                        "src/native/argon2.c",
                        "src/native/blake2/blake2b.c",
                        "src/native/core.c",
                        "src/native/encoding.c",
                        "src/native/krypton_native.c",
                        "src/native/opt.c",
                        "src/native/sha256.c",
                        "src/native/sha512.c",
                        "src/native/ripemd160.c",
                        "src/native/keccak.c",
                        "src/native/util.c",
                        "src/native/ed25519/collective.c",
                        "src/native/ed25519/fe.c",
                        "src/native/ed25519/ge.c",
                        "src/native/ed25519/keypair.c",
                        "src/native/ed25519/memory.c",
                        "src/native/ed25519/sc.c",
                        "src/native/ed25519/sign.c",
                        "src/native/ed25519/verify.c",
                        "src/native/secp256k1/precomputed_ecmult_gen.c",
                        "src/native/secp256k1/precomputed_ecmult.c",
                        "src/native/secp256k1/secp256k1.c",
                        "src/native/secp256k1_native.c",
                        "src/native/krypton_node.cc"
                    ],
                    "defines": [
                        "ARGON2_NO_THREADS"
                    ],
                    "include_dirs": [
                        "<!(node -e \"require('nan')\")",
                        "src/native"
                    ],
                    "cflags_c": [
                        "-std=c99",
                        "-mtune=generic",
                        "-msse",
                        "-msse2",
                        "-mavx"
                    ],
                    "xcode_settings": {
                        "OTHER_CFLAGS": [
                            "-mtune=generic",
                            "-msse",
                            "-msse2",
                            "-mavx"
                        ]
                    }
                },
                {
                    "target_name": "krypton_node_avx2",
                    "sources": [
                        "src/native/argon2.c",
                        "src/native/blake2/blake2b.c",
                        "src/native/core.c",
                        "src/native/encoding.c",
                        "src/native/krypton_native.c",
                        "src/native/opt.c",
                        "src/native/sha256.c",
                        "src/native/sha512.c",
                        "src/native/ripemd160.c",
                        "src/native/keccak.c",
                        "src/native/util.c",
                        "src/native/ed25519/collective.c",
                        "src/native/ed25519/fe.c",
                        "src/native/ed25519/ge.c",
                        "src/native/ed25519/keypair.c",
                        "src/native/ed25519/memory.c",
                        "src/native/ed25519/sc.c",
                        "src/native/ed25519/sign.c",
                        "src/native/ed25519/verify.c",
                        "src/native/secp256k1/precomputed_ecmult_gen.c",
                        "src/native/secp256k1/precomputed_ecmult.c",
                        "src/native/secp256k1/secp256k1.c",
                        "src/native/secp256k1_native.c",
                        "src/native/krypton_node.cc"
                    ],
                    "defines": [
                        "ARGON2_NO_THREADS"
                    ],
                    "include_dirs": [
                        "<!(node -e \"require('nan')\")",
                        "src/native"
                    ],
                    "cflags_c": [
                        "-std=c99",
                        "-mtune=generic",
                        "-msse",
                        "-msse2",
                        "-mavx",
                        "-mavx2"
                    ],
                    "xcode_settings": {
                        "OTHER_CFLAGS": [
                            "-mtune=generic",
                            "-msse",
                            "-msse2",
                            "-mavx",
                            "-mavx2"
                        ]
                    }
                },
                {
                    "target_name": "krypton_node_avx512f",
                    "sources": [
                        "src/native/argon2.c",
                        "src/native/blake2/blake2b.c",
                        "src/native/core.c",
                        "src/native/encoding.c",
                        "src/native/krypton_native.c",
                        "src/native/opt.c",
                        "src/native/sha256.c",
                        "src/native/sha512.c",
                        "src/native/ripemd160.c",
                        "src/native/keccak.c",
                        "src/native/util.c",
                        "src/native/ed25519/collective.c",
                        "src/native/ed25519/fe.c",
                        "src/native/ed25519/ge.c",
                        "src/native/ed25519/keypair.c",
                        "src/native/ed25519/memory.c",
                        "src/native/ed25519/sc.c",
                        "src/native/ed25519/sign.c",
                        "src/native/ed25519/verify.c",
                        "src/native/secp256k1/precomputed_ecmult_gen.c",
                        "src/native/secp256k1/precomputed_ecmult.c",
                        "src/native/secp256k1/secp256k1.c",
                        "src/native/secp256k1_native.c",
                        "src/native/krypton_node.cc"
                    ],
                    "defines": [
                        "ARGON2_NO_THREADS"
                    ],
                    "include_dirs": [
                        "<!(node -e \"require('nan')\")",
                        "src/native"
                    ],
                    "cflags_c": [
                        "-std=c99",
                        "-msse",
                        "-msse2",
                        "-mavx",
                        "-mavx2",
                        "-mavx512f"
                    ],
                    "xcode_settings": {
                        "OTHER_CFLAGS": [
                            "-msse",
                            "-msse2",
                            "-mavx",
                            "-mavx2",
                            "-mavx512f"
                        ]
                    }
                },
            ]
        }]
    ],
}
