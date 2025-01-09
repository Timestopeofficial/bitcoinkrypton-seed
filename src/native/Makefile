CFLAGS := -Wall -Werror -Wno-unused-function -I. -DARGON2_NO_THREADS

EMCC := emcc
UGLIFY := uglifyjs
DISTDIR := ../../dist
EMCC_BASE_FLAGS := -s NO_FILESYSTEM=1 -s ASSERTIONS=0 -s USE_CLOSURE_COMPILER=1 -s EXPORTED_RUNTIME_METHODS=[]
EMCC_WASM_FLAGS := -s WASM=1 -s DEMANGLE_SUPPORT=0 -s WARN_UNALIGNED=1
EMCC_LIB_FLAGS := -s NO_EXIT_RUNTIME=1 -s MODULARIZE=1 \
    -s 'EXPORTED_FUNCTIONS=["_malloc","_free","_ripemd160","_keccak256","_krypton_blake2","_krypton_argon2","_krypton_argon2_no_wipe","_krypton_argon2_verify","_krypton_argon2_target","_krypton_kdf_legacy","_krypton_kdf","_krypton_sha256","_krypton_sha512","_ed25519_sign","_ed25519_verify","_get_static_memory_start","_get_static_memory_size","_ed25519_public_key_derive","_ed25519_create_commitment","_ed25519_add_scalars","_ed25519_aggregate_commitments","_ed25519_hash_public_keys","_ed25519_delinearize_public_key","_ed25519_aggregate_delinearized_public_keys","_ed25519_derive_delinearized_private_key","_ed25519_delinearized_partial_sign","_secp256k1_ctx_init","_secp256k1_ctx_release","_secp256k1_pubkey_create","_secp256k1_schnorr_sign","_secp256k1_schnorr_verify","_secp256k1_hash_pubkeys","_secp256k1_delinearize_pubkey","_secp256k1_aggregate_delinearized_publkeys","_secp256k1_derive_delinearized_seckey","_secp256k1_partial_sign","_secp256k1_create_commitment","_secp256k1_aggregate_commitments","_secp256k1_add_scalars","_secp256k1_pubkey_compress"]'
EMCC_OPT_FLAGS := -msse2

BASE_FILES := krypton_native.c \
    argon2.c core.c encoding.c \
    blake2/blake2b.c \
    sha256.c \
    ed25519/collective.c ed25519/fe.c ed25519/ge.c ed25519/keypair.c \
    ed25519/memory.c ed25519/sc.c sha512.c ripemd160.c keccak.c util.c ed25519/sign.c ed25519/verify.c \
		secp256k1/secp256k1.c secp256k1/precomputed_ecmult.c secp256k1/precomputed_ecmult_gen.c secp256k1_native.c

ALL_TARGETS := test.html test.js test.wasm test worker-wasm.js worker-wasm.wasm worker-js.js
ALL_INSTALL := $(DISTDIR)/worker-wasm.js $(DISTDIR)/worker-js.js $(DISTDIR)/worker-wasm.wasm

default: worker-wasm.js worker-js.js

install: $(ALL_INSTALL)

installclean:
	rm -f $(ALL_INSTALL)

$(DISTDIR)/worker-wasm.js: worker-wasm.js suffix.js
	$(UGLIFY) $^ > $@

$(DISTDIR)/worker-js.js: worker-js.js suffix.js
	$(UGLIFY) $^ > $@

$(DISTDIR)/worker-wasm.wasm: worker-wasm.js
	cp worker-wasm.wasm $@

worker-wasm.js: $(BASE_FILES)
	$(EMCC) $(CFLAGS) -O3 -g $(EMCC_BASE_FLAGS) $(EMCC_LIB_FLAGS) $(EMCC_WASM_FLAGS) -o $@ $^ ref.c

worker-js.js: $(BASE_FILES)
	$(EMCC) $(CFLAGS) -O1 $(EMCC_BASE_FLAGS) $(EMCC_LIB_FLAGS) -o $@ $^ ref.c

test.html: $(BASE_FILES) krypton_run.c
	$(EMCC) $(CFLAGS) -O3 -g $(EMCC_BASE_FLAGS) $(EMCC_WASM_FLAGS) -o $@ $^ ref.c

test: $(BASE_FILES) krypton_run.c
	$(CC) -O3 -g $(CFLAGS) -march=native -mtune=native -o $@ $^ opt.c

clean:
	rm -f $(ALL_TARGETS)
