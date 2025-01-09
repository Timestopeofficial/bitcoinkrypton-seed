#include <nan.h>
extern "C" {
#include "krypton_native.h"
#include "ed25519/ed25519.h"
#include "secp256k1_native.h"
#include "ripemd160.h"
#include "keccak.h"
}

using v8::Function;
using v8::FunctionTemplate;
using v8::Local;
using v8::Number;
using v8::Object;
using v8::String;
using v8::Uint8Array;
using v8::Value;
using Nan::AsyncQueueWorker;
using Nan::AsyncWorker;
using Nan::Callback;
using Nan::GetFunction;
using Nan::HandleScope;
using Nan::New;
using Nan::Null;
using Nan::Set;
using Nan::To;

class MinerWorker : public AsyncWorker {
    public:
        MinerWorker(Callback* callback, void* in, uint32_t inlen, uint32_t compact, uint32_t min_nonce, uint32_t max_nonce, uint32_t m_cost)
            : AsyncWorker(callback), in(in), inlen(inlen), compact(compact), min_nonce(min_nonce), max_nonce(max_nonce), m_cost(m_cost), result_nonce(0) {}
        ~MinerWorker() {}

        void Execute() {
            result_nonce = krypton_argon2_target(out, in, inlen, compact, min_nonce, max_nonce, m_cost);
        }

        void HandleOKCallback() {
            HandleScope scope;
            Local<Value> argv[] = {New<Number>(result_nonce)};
            callback->Call(1, argv, async_resource);
        }

    private:
        uint8_t out[32];
        void* in;
        uint32_t inlen;
        uint32_t compact;
        uint32_t min_nonce;
        uint32_t max_nonce;
        uint32_t m_cost;
        uint32_t result_nonce;
};

class Argon2Worker : public AsyncWorker {
    public:
        Argon2Worker(Callback* callback, void* out, void* in, uint32_t inlen, uint32_t m_cost)
            : AsyncWorker(callback), out(out), in(in), inlen(inlen), m_cost(m_cost), res(0) {}
        ~Argon2Worker() {}

        void Execute()  {
            res = krypton_argon2(out, in, inlen, m_cost);
        }

        void HandleOKCallback() {
            HandleScope scope;
            Local<Value> argv[] = {New<Number>(res)};
            callback->Call(1, argv, async_resource);
        }

    private:
        void* out;
        void* in;
        uint32_t inlen;
        uint32_t m_cost;
        int res;
};

NAN_METHOD(node_argon2_target_async) {
    Callback* callback = new Callback(info[0].As<Function>());

    Local<Uint8Array> in_array = info[1].As<Uint8Array>();
    uint32_t inlen = in_array->Length();

#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    void* in = in_array->Buffer()->GetBackingStore()->Data();
#else
    void* in = in_array->Buffer()->GetContents().Data();
#endif

    uint32_t compact = To<uint32_t>(info[2]).FromJust();
    uint32_t min_nonce = To<uint32_t>(info[3]).FromJust();
    uint32_t max_nonce = To<uint32_t>(info[4]).FromJust();
    uint32_t m_cost = To<uint32_t>(info[5]).FromJust();

    AsyncQueueWorker(new MinerWorker(callback, in, inlen, compact, min_nonce, max_nonce, m_cost));
}

NAN_METHOD(node_sha256) {
    Local<Uint8Array> out_array = info[0].As<Uint8Array>();
    Local<Uint8Array> in_array = info[1].As<Uint8Array>();
    uint32_t inlen = in_array->Length();
#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    void* out = out_array->Buffer()->GetBackingStore()->Data();
    void* in = in_array->Buffer()->GetBackingStore()->Data();
#else
    void* out = out_array->Buffer()->GetContents().Data();
    void* in = in_array->Buffer()->GetContents().Data();
#endif
    krypton_sha256(out, in, inlen);
}

NAN_METHOD(node_sha512) {
    Local<Uint8Array> out_array = info[0].As<Uint8Array>();
    Local<Uint8Array> in_array = info[1].As<Uint8Array>();
    uint32_t inlen = in_array->Length();
#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    void* out = out_array->Buffer()->GetBackingStore()->Data();
    void* in = in_array->Buffer()->GetBackingStore()->Data();
#else
    void* out = out_array->Buffer()->GetContents().Data();
    void* in = in_array->Buffer()->GetContents().Data();
#endif
    krypton_sha512(out, in, inlen);
}

NAN_METHOD(node_blake2) {
    Local<Uint8Array> out_array = info[0].As<Uint8Array>();
    Local<Uint8Array> in_array = info[1].As<Uint8Array>();
    uint32_t inlen = in_array->Length();
#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    void* out = out_array->Buffer()->GetBackingStore()->Data();
    void* in = in_array->Buffer()->GetBackingStore()->Data();
#else
    void* out = out_array->Buffer()->GetContents().Data();
    void* in = in_array->Buffer()->GetContents().Data();
#endif
    krypton_blake2(out, in, inlen);
}

NAN_METHOD(node_argon2) {
    Local<Uint8Array> out_array = info[0].As<Uint8Array>();
    Local<Uint8Array> in_array = info[1].As<Uint8Array>();
    uint32_t m_cost = To<uint32_t>(info[2]).FromJust();
    uint32_t inlen = in_array->Length();
#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    void* out = out_array->Buffer()->GetBackingStore()->Data();
    void* in = in_array->Buffer()->GetBackingStore()->Data();
#else
    void* out = out_array->Buffer()->GetContents().Data();
    void* in = in_array->Buffer()->GetContents().Data();
#endif

    info.GetReturnValue().Set(New<Number>(krypton_argon2(out, in, inlen, m_cost)));
}

NAN_METHOD(node_argon2_async) {
    Callback* callback = new Callback(info[0].As<Function>());

    Local<Uint8Array> out_array = info[1].As<Uint8Array>();
    Local<Uint8Array> in_array = info[2].As<Uint8Array>();
    uint32_t m_cost = To<uint32_t>(info[3]).FromJust();
    uint32_t inlen = in_array->Length();
#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    void* out = out_array->Buffer()->GetBackingStore()->Data();
    void* in = in_array->Buffer()->GetBackingStore()->Data();
#else
    void* out = out_array->Buffer()->GetContents().Data();
    void* in = in_array->Buffer()->GetContents().Data();
#endif
    AsyncQueueWorker(new Argon2Worker(callback, out, in, inlen, m_cost));
}

NAN_METHOD(node_ed25519_public_key_derive) {
    Local<Uint8Array> out_array = info[0].As<Uint8Array>();
    Local<Uint8Array> in_array = info[1].As<Uint8Array>();
#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    uint8_t* out = (uint8_t*) out_array->Buffer()->GetBackingStore()->Data();
    uint8_t* in = (uint8_t*) in_array->Buffer()->GetBackingStore()->Data();
#else
    uint8_t* out = (uint8_t*) out_array->Buffer()->GetContents().Data();
    uint8_t* in = (uint8_t*) in_array->Buffer()->GetContents().Data();
#endif

    ed25519_public_key_derive(out, in);
}

NAN_METHOD(node_ed25519_hash_public_keys) {
    Local<Uint8Array> out_array = info[0].As<Uint8Array>();
    Local<Uint8Array> in_array = info[1].As<Uint8Array>();
    uint32_t length = To<uint32_t>(info[2]).FromJust();
#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    uint8_t* out = (uint8_t*) out_array->Buffer()->GetBackingStore()->Data();
    uint8_t* in = (uint8_t*) in_array->Buffer()->GetBackingStore()->Data();
#else
    uint8_t* out = (uint8_t*) out_array->Buffer()->GetContents().Data();
    uint8_t* in = (uint8_t*) in_array->Buffer()->GetContents().Data();
#endif

    ed25519_hash_public_keys(out, in, length);
}

NAN_METHOD(node_ed25519_delinearize_public_key) {
    Local<Uint8Array> out_array = info[0].As<Uint8Array>();
    Local<Uint8Array> hash_array = info[1].As<Uint8Array>();
    Local<Uint8Array> key_array = info[2].As<Uint8Array>();
#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    uint8_t* out = (uint8_t*) out_array->Buffer()->GetBackingStore()->Data();
    uint8_t* hash = (uint8_t*) hash_array->Buffer()->GetBackingStore()->Data();
    uint8_t* key = (uint8_t*) key_array->Buffer()->GetBackingStore()->Data();
#else
    uint8_t* out = (uint8_t*) out_array->Buffer()->GetContents().Data();
    uint8_t* hash = (uint8_t*) hash_array->Buffer()->GetContents().Data();
    uint8_t* key = (uint8_t*) key_array->Buffer()->GetContents().Data();
#endif

    ed25519_delinearize_public_key(out, hash, key);
}

NAN_METHOD(node_ed25519_aggregate_delinearized_public_keys) {
    Local<Uint8Array> out_array = info[0].As<Uint8Array>();
    Local<Uint8Array> hash_array = info[1].As<Uint8Array>();
    Local<Uint8Array> keys_array = info[2].As<Uint8Array>();
    uint32_t length = To<uint32_t>(info[3]).FromJust();
#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    uint8_t* out = (uint8_t*) out_array->Buffer()->GetBackingStore()->Data();
    uint8_t* hash = (uint8_t*) hash_array->Buffer()->GetBackingStore()->Data();
    uint8_t* keys = (uint8_t*) keys_array->Buffer()->GetBackingStore()->Data();
#else
    uint8_t* out = (uint8_t*) out_array->Buffer()->GetContents().Data();
    uint8_t* hash = (uint8_t*) hash_array->Buffer()->GetContents().Data();
    uint8_t* keys = (uint8_t*) keys_array->Buffer()->GetContents().Data();
#endif

    ed25519_aggregate_delinearized_public_keys(out, hash, keys, length);
}

NAN_METHOD(node_ed25519_add_scalars) {
    Local<Uint8Array> out_array = info[0].As<Uint8Array>();
    Local<Uint8Array> a_array = info[1].As<Uint8Array>();
    Local<Uint8Array> b_array = info[2].As<Uint8Array>();
#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    uint8_t* out = (uint8_t*) out_array->Buffer()->GetBackingStore()->Data();
    uint8_t* a = (uint8_t*) a_array->Buffer()->GetBackingStore()->Data();
    uint8_t* b = (uint8_t*) b_array->Buffer()->GetBackingStore()->Data();
#else
    uint8_t* out = (uint8_t*) out_array->Buffer()->GetContents().Data();
    uint8_t* a = (uint8_t*) a_array->Buffer()->GetContents().Data();
    uint8_t* b = (uint8_t*) b_array->Buffer()->GetContents().Data();
#endif

    ed25519_add_scalars(out, a, b);
}

NAN_METHOD(node_ed25519_sign) {
    Local<Uint8Array> out_array = info[0].As<Uint8Array>();
    Local<Uint8Array> message_array = info[1].As<Uint8Array>();
    Local<Uint8Array> pubkey_array = info[2].As<Uint8Array>();
    Local<Uint8Array> privkey_array = info[3].As<Uint8Array>();
    uint32_t message_length = message_array->Length();

#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    uint8_t* out = (uint8_t*) out_array->Buffer()->GetBackingStore()->Data();
    uint8_t* message = (uint8_t*) message_array->Buffer()->GetBackingStore()->Data();
    uint8_t* pubkey = (uint8_t*) pubkey_array->Buffer()->GetBackingStore()->Data();
    uint8_t* privkey = (uint8_t*) privkey_array->Buffer()->GetBackingStore()->Data();
#else
    uint8_t* out = (uint8_t*) out_array->Buffer()->GetContents().Data();
    uint8_t* message = (uint8_t*) message_array->Buffer()->GetContents().Data();
    uint8_t* pubkey = (uint8_t*) pubkey_array->Buffer()->GetContents().Data();
    uint8_t* privkey = (uint8_t*) privkey_array->Buffer()->GetContents().Data();
#endif

    ed25519_sign(out, message, message_length, pubkey, privkey);
}

NAN_METHOD(node_ed25519_verify) {
    Local<Uint8Array> signature_array = info[0].As<Uint8Array>();
    Local<Uint8Array> message_array = info[1].As<Uint8Array>();
    Local<Uint8Array> pubkey_array = info[2].As<Uint8Array>();
    uint32_t message_length = message_array->Length();

#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    uint8_t* signature = (uint8_t*) signature_array->Buffer()->GetBackingStore()->Data();
    uint8_t* message = (uint8_t*) message_array->Buffer()->GetBackingStore()->Data();
    uint8_t* pubkey = (uint8_t*) pubkey_array->Buffer()->GetBackingStore()->Data();
#else
    uint8_t* signature = (uint8_t*) signature_array->Buffer()->GetContents().Data();
    uint8_t* message = (uint8_t*) message_array->Buffer()->GetContents().Data();
    uint8_t* pubkey = (uint8_t*) pubkey_array->Buffer()->GetContents().Data();
#endif

    info.GetReturnValue().Set(New<Number>(ed25519_verify(signature, message, message_length, pubkey)));
}

NAN_METHOD(node_kdf_legacy) {
    Local<Uint8Array> out_array = info[0].As<Uint8Array>();
    Local<Uint8Array> key_array = info[1].As<Uint8Array>();
    Local<Uint8Array> salt_array = info[2].As<Uint8Array>();
    uint32_t m_cost = To<uint32_t>(info[3]).FromJust();
    uint32_t iterations = To<uint32_t>(info[4]).FromJust();
    uint32_t outlen = out_array->Length();
    uint32_t keylen = key_array->Length();
    uint32_t saltlen = salt_array->Length();

#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    void* out = out_array->Buffer()->GetBackingStore()->Data();
    void* key = key_array->Buffer()->GetBackingStore()->Data();
    void* salt = salt_array->Buffer()->GetBackingStore()->Data();
#else
    void* out = out_array->Buffer()->GetContents().Data();
    void* key = key_array->Buffer()->GetContents().Data();
    void* salt = salt_array->Buffer()->GetContents().Data();
#endif

    info.GetReturnValue().Set(New<Number>(krypton_kdf_legacy(out, outlen, key, keylen, salt, saltlen, m_cost, iterations)));
}

NAN_METHOD(node_kdf) {
    Local<Uint8Array> out_array = info[0].As<Uint8Array>();
    Local<Uint8Array> key_array = info[1].As<Uint8Array>();
    Local<Uint8Array> salt_array = info[2].As<Uint8Array>();
    uint32_t m_cost = To<uint32_t>(info[3]).FromJust();
    uint32_t iterations = To<uint32_t>(info[4]).FromJust();
    uint32_t outlen = out_array->Length();
    uint32_t keylen = key_array->Length();
    uint32_t saltlen = salt_array->Length();

#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    void* out = out_array->Buffer()->GetBackingStore()->Data();
    void* key = key_array->Buffer()->GetBackingStore()->Data();
    void* salt = salt_array->Buffer()->GetBackingStore()->Data();
#else
    void* out = out_array->Buffer()->GetContents().Data();
    void* key = key_array->Buffer()->GetContents().Data();
    void* salt = salt_array->Buffer()->GetContents().Data();
#endif

    info.GetReturnValue().Set(New<Number>(krypton_kdf(out, outlen, key, keylen, salt, saltlen, m_cost, iterations)));
}

NAN_METHOD(node_ed25519_aggregate_commitments) {
    Local<Uint8Array> out_array = info[0].As<Uint8Array>();
    Local<Uint8Array> in_array = info[1].As<Uint8Array>();
    uint32_t length = To<uint32_t>(info[2]).FromJust();

#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    uint8_t* out = (uint8_t*) out_array->Buffer()->GetBackingStore()->Data();
    uint8_t* in = (uint8_t*) in_array->Buffer()->GetBackingStore()->Data();
#else
    uint8_t* out = (uint8_t*) out_array->Buffer()->GetContents().Data();
    uint8_t* in = (uint8_t*) in_array->Buffer()->GetContents().Data();
#endif

    ed25519_aggregate_commitments(out, in, length);
}

NAN_METHOD(node_ed25519_create_commitment) {
    Local<Uint8Array> out_secret_array = info[0].As<Uint8Array>();
    Local<Uint8Array> out_commitment_array = info[1].As<Uint8Array>();
    Local<Uint8Array> in_array = info[2].As<Uint8Array>();

#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    uint8_t* out_secret = (uint8_t*) out_secret_array->Buffer()->GetBackingStore()->Data();
    uint8_t* out_commitment = (uint8_t*) out_commitment_array->Buffer()->GetBackingStore()->Data();
    uint8_t* in = (uint8_t*) in_array->Buffer()->GetBackingStore()->Data();
#else
    uint8_t* out_secret = (uint8_t*) out_secret_array->Buffer()->GetContents().Data();
    uint8_t* out_commitment = (uint8_t*) out_commitment_array->Buffer()->GetContents().Data();
    uint8_t* in = (uint8_t*) in_array->Buffer()->GetContents().Data();
#endif

    ed25519_create_commitment(out_secret, out_commitment, in);
}

NAN_METHOD(node_ed25519_derive_delinearized_private_key) {
    Local<Uint8Array> out_array = info[0].As<Uint8Array>();
    Local<Uint8Array> in_hash_array = info[1].As<Uint8Array>();
    Local<Uint8Array> in_public_array = info[2].As<Uint8Array>();
    Local<Uint8Array> in_private_array = info[3].As<Uint8Array>();

#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    uint8_t* out = (uint8_t*) out_array->Buffer()->GetBackingStore()->Data();
    uint8_t* in_hash = (uint8_t*) in_hash_array->Buffer()->GetBackingStore()->Data();
    uint8_t* in_public = (uint8_t*) in_public_array->Buffer()->GetBackingStore()->Data();
    uint8_t* in_private = (uint8_t*) in_private_array->Buffer()->GetBackingStore()->Data();
#else
    uint8_t* out = (uint8_t*) out_array->Buffer()->GetContents().Data();
    uint8_t* in_hash = (uint8_t*) in_hash_array->Buffer()->GetContents().Data();
    uint8_t* in_public = (uint8_t*) in_public_array->Buffer()->GetContents().Data();
    uint8_t* in_private = (uint8_t*) in_private_array->Buffer()->GetContents().Data();
#endif

    ed25519_derive_delinearized_private_key(out, in_hash, in_public, in_private);
}

NAN_METHOD(node_ed25519_delinearized_partial_sign) {
    Local<Uint8Array> out_array = info[0].As<Uint8Array>();
    Local<Uint8Array> message_array = info[1].As<Uint8Array>();
    Local<Uint8Array> commitment_array = info[2].As<Uint8Array>();
    Local<Uint8Array> secret_array = info[3].As<Uint8Array>();
    Local<Uint8Array> keys_array = info[4].As<Uint8Array>();
    uint32_t keys_length = To<uint32_t>(info[5]).FromJust();
    Local<Uint8Array> pubkey_array = info[6].As<Uint8Array>();
    Local<Uint8Array> privkey_array = info[7].As<Uint8Array>();
    uint32_t message_length = message_array->Length();

#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    uint8_t* out = (uint8_t*) out_array->Buffer()->GetBackingStore()->Data();
    uint8_t* message = (uint8_t*) message_array->Buffer()->GetBackingStore()->Data();
    uint8_t* commitment = (uint8_t*) commitment_array->Buffer()->GetBackingStore()->Data();
    uint8_t* secret = (uint8_t*) secret_array->Buffer()->GetBackingStore()->Data();
    uint8_t* keys = (uint8_t*) keys_array->Buffer()->GetBackingStore()->Data();
    uint8_t* pubkey = (uint8_t*) pubkey_array->Buffer()->GetBackingStore()->Data();
    uint8_t* privkey = (uint8_t*) privkey_array->Buffer()->GetBackingStore()->Data();
#else
    uint8_t* out = (uint8_t*) out_array->Buffer()->GetContents().Data();
    uint8_t* message = (uint8_t*) message_array->Buffer()->GetContents().Data();
    uint8_t* commitment = (uint8_t*) commitment_array->Buffer()->GetContents().Data();
    uint8_t* secret = (uint8_t*) secret_array->Buffer()->GetContents().Data();
    uint8_t* keys = (uint8_t*) keys_array->Buffer()->GetContents().Data();
    uint8_t* pubkey = (uint8_t*) pubkey_array->Buffer()->GetContents().Data();
    uint8_t* privkey = (uint8_t*) privkey_array->Buffer()->GetContents().Data();
#endif

    ed25519_delinearized_partial_sign(out, message, message_length, commitment, secret, keys, keys_length, pubkey, privkey);
}

NAN_METHOD(node_ripemd160) {
    Local<Uint8Array> out_array = info[0].As<Uint8Array>();
    Local<Uint8Array> in_array = info[1].As<Uint8Array>();
    uint32_t inlen = in_array->Length();
#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    uint8_t* out = (uint8_t*) out_array->Buffer()->GetBackingStore()->Data();
    uint8_t* in = (uint8_t*) in_array->Buffer()->GetBackingStore()->Data();
#else
    uint8_t* out = (uint8_t*) out_array->Buffer()->GetContents().Data();
    uint8_t* in = (uint8_t*) in_array->Buffer()->GetContents().Data();
#endif
    info.GetReturnValue().Set(New<Number>(ripemd160(in, inlen, out)));
}

NAN_METHOD(node_keccak256) {
    Local<Uint8Array> out_array = info[0].As<Uint8Array>();
    Local<Uint8Array> in_array = info[1].As<Uint8Array>();
    uint32_t inlen = in_array->Length();
#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    uint8_t* out = (uint8_t*) out_array->Buffer()->GetBackingStore()->Data();
    uint8_t* in = (uint8_t*) in_array->Buffer()->GetBackingStore()->Data();
#else
    uint8_t* out = (uint8_t*) out_array->Buffer()->GetContents().Data();
    uint8_t* in = (uint8_t*) in_array->Buffer()->GetContents().Data();
#endif
    keccak256(in, inlen, out);
}

NAN_METHOD(node_secp256k1_ctx_init) {
    Local<Uint8Array> randomize_array = info[0].As<Uint8Array>();
#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    uint8_t* randomize = (uint8_t*) randomize_array->Buffer()->GetBackingStore()->Data();
#else
    uint8_t* randomize = (uint8_t*) randomize_array->Buffer()->GetContents().Data();
#endif
    secp256k1_ctx_init(randomize);
}

NAN_METHOD(node_secp256k1_ctx_release) {
    secp256k1_ctx_release();
}

NAN_METHOD(node_secp256k1_seckey_verify) {
    Local<Uint8Array> in_array = info[0].As<Uint8Array>();
#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    uint8_t* seckey = (uint8_t*) in_array->Buffer()->GetBackingStore()->Data();
#else
    uint8_t* seckey = (uint8_t*) in_array->Buffer()->GetContents().Data();
#endif
    info.GetReturnValue().Set(New<Number>(secp256k1_seckey_verify(seckey)));
}

NAN_METHOD(node_secp256k1_pubkey_create) {
    Local<Uint8Array> out_pubkey = info[0].As<Uint8Array>();
    Local<Uint8Array> in_seckey = info[1].As<Uint8Array>();
#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    uint8_t* output = (uint8_t*) out_pubkey->Buffer()->GetBackingStore()->Data();
    uint8_t* seckey = (uint8_t*) in_seckey->Buffer()->GetBackingStore()->Data();
#else
    uint8_t* output = (uint8_t*) out_pubkey->Buffer()->GetContents().Data();
    uint8_t* seckey = (uint8_t*) in_seckey->Buffer()->GetContents().Data();
#endif
    size_t outputlen = out_pubkey->Length();
    secp256k1_pubkey_create(output, outputlen, seckey);
}

NAN_METHOD(node_secp256k1_pubkey_verify) {
    Local<Uint8Array> pubkey_array = info[0].As<Uint8Array>();
#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    uint8_t* pubkey = (uint8_t*) pubkey_array->Buffer()->GetBackingStore()->Data();
#else
    uint8_t* pubkey = (uint8_t*) pubkey_array->Buffer()->GetContents().Data();
#endif
    info.GetReturnValue().Set(New<Number>(secp256k1_pubkey_verify(pubkey)));
}

NAN_METHOD(node_secp256k1_pubkey_compress) {
    Local<Uint8Array> out_pubkey_array = info[0].As<Uint8Array>();
    Local<Uint8Array> in_pubkey_array = info[1].As<Uint8Array>();
#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    uint8_t* out_pubkey = (uint8_t*) out_pubkey_array->Buffer()->GetBackingStore()->Data();
    uint8_t* in_pubkey = (uint8_t*) in_pubkey_array->Buffer()->GetBackingStore()->Data();
#else
    uint8_t* out_pubkey = (uint8_t*) out_pubkey_array->Buffer()->GetContents().Data();
    uint8_t* in_pubkey = (uint8_t*) in_pubkey_array->Buffer()->GetContents().Data();
#endif
    info.GetReturnValue().Set(New<Number>(secp256k1_pubkey_compress(out_pubkey, in_pubkey)));
}

NAN_METHOD(node_secp256k1_pubkey_decompress) {
    Local<Uint8Array> out_pubkey_array = info[0].As<Uint8Array>();
    Local<Uint8Array> in_pubkey_array = info[1].As<Uint8Array>();
#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    uint8_t* out_pubkey = (uint8_t*) out_pubkey_array->Buffer()->GetBackingStore()->Data();
    uint8_t* in_pubkey = (uint8_t*) in_pubkey_array->Buffer()->GetBackingStore()->Data();
#else
    uint8_t* out_pubkey = (uint8_t*) out_pubkey_array->Buffer()->GetContents().Data();
    uint8_t* in_pubkey = (uint8_t*) in_pubkey_array->Buffer()->GetContents().Data();
#endif
    info.GetReturnValue().Set(New<Number>(secp256k1_pubkey_decompress(out_pubkey, in_pubkey)));
}

NAN_METHOD(node_secp256k1_sign) {
    Local<Uint8Array> out_array = info[0].As<Uint8Array>();
    Local<Uint8Array> message_array = info[1].As<Uint8Array>();
    Local<Uint8Array> privkey_array = info[2].As<Uint8Array>();
    uint32_t message_length = message_array->Length();

#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    uint8_t* output = (uint8_t*) out_array->Buffer()->GetBackingStore()->Data();
    uint8_t* message = (uint8_t*) message_array->Buffer()->GetBackingStore()->Data();
    uint8_t* seckey = (uint8_t*) privkey_array->Buffer()->GetBackingStore()->Data();
#else
    uint8_t* output = (uint8_t*) out_array->Buffer()->GetContents().Data();
    uint8_t* message = (uint8_t*) message_array->Buffer()->GetContents().Data();
    uint8_t* seckey = (uint8_t*) privkey_array->Buffer()->GetContents().Data();
#endif
    unsigned char msghash32[32];
    krypton_sha256(msghash32, message, message_length);
    
    info.GetReturnValue().Set(New<Number>(secp256k1_sign(output, msghash32, seckey)));
}

NAN_METHOD(node_secp256k1_verify) {
    Local<Uint8Array> signature_array = info[0].As<Uint8Array>();
    Local<Uint8Array> message_array = info[1].As<Uint8Array>();
    Local<Uint8Array> pubkey_array = info[2].As<Uint8Array>();
    size_t message_length = message_array->Length();
    size_t signature_length = signature_array->Length();

#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    uint8_t* signature = (uint8_t*) signature_array->Buffer()->GetBackingStore()->Data();
    uint8_t* message = (uint8_t*) message_array->Buffer()->GetBackingStore()->Data();
    uint8_t* pubkey = (uint8_t*) pubkey_array->Buffer()->GetBackingStore()->Data();
#else
    uint8_t* signature = (uint8_t*) signature_array->Buffer()->GetContents().Data();
    uint8_t* message = (uint8_t*) message_array->Buffer()->GetContents().Data();
    uint8_t* pubkey = (uint8_t*) pubkey_array->Buffer()->GetContents().Data();
#endif
    unsigned char msghash32[32];
    krypton_sha256(msghash32, message, message_length);

    info.GetReturnValue().Set(New<Number>(secp256k1_verify(msghash32, pubkey, signature, signature_length)));
}

NAN_METHOD(node_secp256k1_sign_compact) {
    Local<Uint8Array> out_array = info[0].As<Uint8Array>();
    Local<Uint8Array> message_array = info[1].As<Uint8Array>();
    Local<Uint8Array> privkey_array = info[2].As<Uint8Array>();

#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    uint8_t* output = (uint8_t*) out_array->Buffer()->GetBackingStore()->Data();
    uint8_t* msghash32 = (uint8_t*) message_array->Buffer()->GetBackingStore()->Data();
    uint8_t* seckey = (uint8_t*) privkey_array->Buffer()->GetBackingStore()->Data();
#else
    uint8_t* output = (uint8_t*) out_array->Buffer()->GetContents().Data();
    uint8_t* msghash32 = (uint8_t*) message_array->Buffer()->GetContents().Data();
    uint8_t* seckey = (uint8_t*) privkey_array->Buffer()->GetContents().Data();
#endif
    
    info.GetReturnValue().Set(New<Number>(secp256k1_sign_compact(output, msghash32, seckey)));
}

NAN_METHOD(node_secp256k1_sign_compact_verify) {
    Local<Uint8Array> signature_array = info[0].As<Uint8Array>();
    Local<Uint8Array> message_array = info[1].As<Uint8Array>();
    Local<Uint8Array> pubkey_array = info[2].As<Uint8Array>();

#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    uint8_t* signature = (uint8_t*) signature_array->Buffer()->GetBackingStore()->Data();
    uint8_t* msghash32 = (uint8_t*) message_array->Buffer()->GetBackingStore()->Data();
    uint8_t* pubkey = (uint8_t*) pubkey_array->Buffer()->GetBackingStore()->Data();
#else
    uint8_t* signature = (uint8_t*) signature_array->Buffer()->GetContents().Data();
    uint8_t* msghash32 = (uint8_t*) message_array->Buffer()->GetContents().Data();
    uint8_t* pubkey = (uint8_t*) pubkey_array->Buffer()->GetContents().Data();
#endif

    info.GetReturnValue().Set(New<Number>(secp256k1_sign_compact_verify(msghash32, pubkey, signature)));
}

NAN_METHOD(node_secp256k1_schnorr_sign) {
    Local<Uint8Array> out_array = info[0].As<Uint8Array>();
    Local<Uint8Array> message_array = info[1].As<Uint8Array>();
    Local<Uint8Array> pubkey_array = info[2].As<Uint8Array>();
    Local<Uint8Array> privkey_array = info[3].As<Uint8Array>();
    uint32_t msglen = message_array->Length();

#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    uint8_t* sig64 = (uint8_t*) out_array->Buffer()->GetBackingStore()->Data();
    uint8_t* msg = (uint8_t*) message_array->Buffer()->GetBackingStore()->Data();
    uint8_t* pubkey = (uint8_t*) pubkey_array->Buffer()->GetBackingStore()->Data();
    uint8_t* seckey = (uint8_t*) privkey_array->Buffer()->GetBackingStore()->Data();
#else
    uint8_t* sig64 = (uint8_t*) out_array->Buffer()->GetContents().Data();
    uint8_t* msg = (uint8_t*) message_array->Buffer()->GetContents().Data();
    uint8_t* pubkey = (uint8_t*) pubkey_array->Buffer()->GetContents().Data();
    uint8_t* seckey = (uint8_t*) privkey_array->Buffer()->GetContents().Data();
#endif
    info.GetReturnValue().Set(New<Number>(secp256k1_schnorr_sign(sig64, msg, msglen, pubkey, seckey)));
}

NAN_METHOD(node_secp256k1_schnorr_verify) {
    Local<Uint8Array> signature_array = info[0].As<Uint8Array>();
    Local<Uint8Array> message_array = info[1].As<Uint8Array>();
    Local<Uint8Array> pubkey_array = info[2].As<Uint8Array>();
    size_t msglen = message_array->Length();

#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    uint8_t* sig64 = (uint8_t*) signature_array->Buffer()->GetBackingStore()->Data();
    uint8_t* msg = (uint8_t*) message_array->Buffer()->GetBackingStore()->Data();
    uint8_t* pubkey = (uint8_t*) pubkey_array->Buffer()->GetBackingStore()->Data();
#else
    uint8_t* sig64 = (uint8_t*) signature_array->Buffer()->GetContents().Data();
    uint8_t* msg = (uint8_t*) message_array->Buffer()->GetContents().Data();
    uint8_t* pubkey = (uint8_t*) pubkey_array->Buffer()->GetContents().Data();
#endif

    info.GetReturnValue().Set(New<Number>(secp256k1_schnorr_verify(sig64, msg, msglen, pubkey)));
}

NAN_METHOD(node_secp256k1_hash_pubkeys) {
    Local<Uint8Array> out_array = info[0].As<Uint8Array>();
    Local<Uint8Array> in_array = info[1].As<Uint8Array>();
    uint32_t num_pubkey = To<uint32_t>(info[2]).FromJust();
    uint32_t pubkey_size = To<uint32_t>(info[3]).FromJust();
#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    uint8_t* out = (uint8_t*) out_array->Buffer()->GetBackingStore()->Data();
    uint8_t* pubkeys = (uint8_t*) in_array->Buffer()->GetBackingStore()->Data();
#else
    uint8_t* out = (uint8_t*) out_array->Buffer()->GetContents().Data();
    uint8_t* pubkeys = (uint8_t*) in_array->Buffer()->GetContents().Data();
#endif

    secp256k1_hash_pubkeys(out, pubkeys, num_pubkey, pubkey_size);
}

NAN_METHOD(node_secp256k1_delinearize_pubkey) {
    Local<Uint8Array> out_array = info[0].As<Uint8Array>();
    Local<Uint8Array> hash_array = info[1].As<Uint8Array>();
    Local<Uint8Array> key_array = info[2].As<Uint8Array>();
    size_t key_len = key_array->Length();
#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    uint8_t* out = (uint8_t*) out_array->Buffer()->GetBackingStore()->Data();
    uint8_t* hash = (uint8_t*) hash_array->Buffer()->GetBackingStore()->Data();
    uint8_t* key = (uint8_t*) key_array->Buffer()->GetBackingStore()->Data();
#else
    uint8_t* out = (uint8_t*) out_array->Buffer()->GetContents().Data();
    uint8_t* hash = (uint8_t*) hash_array->Buffer()->GetContents().Data();
    uint8_t* key = (uint8_t*) key_array->Buffer()->GetContents().Data();
#endif
    secp256k1_delinearize_pubkey(out, hash, key, key_len);
}

NAN_METHOD(node_secp256k1_aggregate_delinearized_publkeys) {
    Local<Uint8Array> out_array = info[0].As<Uint8Array>();
    Local<Uint8Array> hash_array = info[1].As<Uint8Array>();
    Local<Uint8Array> keys_array = info[2].As<Uint8Array>();
    uint32_t num_pubkey = To<uint32_t>(info[3]).FromJust();
    uint32_t key_len = To<uint32_t>(info[4]).FromJust();
#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    uint8_t* out = (uint8_t*) out_array->Buffer()->GetBackingStore()->Data();
    uint8_t* pubkeys_hash = (uint8_t*) hash_array->Buffer()->GetBackingStore()->Data();
    uint8_t* pubkeys = (uint8_t*) keys_array->Buffer()->GetBackingStore()->Data();
#else
    uint8_t* out = (uint8_t*) out_array->Buffer()->GetContents().Data();
    uint8_t* pubkeys_hash = (uint8_t*) hash_array->Buffer()->GetContents().Data();
    uint8_t* pubkeys = (uint8_t*) keys_array->Buffer()->GetContents().Data();
#endif
    info.GetReturnValue().Set(New<Number>(secp256k1_aggregate_delinearized_publkeys(out, pubkeys_hash, pubkeys, num_pubkey, key_len)));
}

NAN_METHOD(node_secp256k1_derive_delinearized_seckey) {
    Local<Uint8Array> out_array = info[0].As<Uint8Array>();
    Local<Uint8Array> in_hash_array = info[1].As<Uint8Array>();
    Local<Uint8Array> in_public_array = info[2].As<Uint8Array>();
    Local<Uint8Array> in_seckey_array = info[3].As<Uint8Array>();

#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    uint8_t* out = (uint8_t*) out_array->Buffer()->GetBackingStore()->Data();
    uint8_t* in_hash = (uint8_t*) in_hash_array->Buffer()->GetBackingStore()->Data();
    uint8_t* pubkey = (uint8_t*) in_public_array->Buffer()->GetBackingStore()->Data();
    uint8_t* seckey = (uint8_t*) in_seckey_array->Buffer()->GetBackingStore()->Data();
#else
    uint8_t* out = (uint8_t*) out_array->Buffer()->GetContents().Data();
    uint8_t* in_hash = (uint8_t*) in_hash_array->Buffer()->GetContents().Data();
    uint8_t* pubkey = (uint8_t*) in_public_array->Buffer()->GetContents().Data();
    uint8_t* seckey = (uint8_t*) in_seckey_array->Buffer()->GetContents().Data();
#endif

    secp256k1_derive_delinearized_seckey(out, in_hash, pubkey, seckey);
}

NAN_METHOD(node_secp256k1_partial_sign) {
    Local<Uint8Array> out_array = info[0].As<Uint8Array>();
    Local<Uint8Array> message_array = info[1].As<Uint8Array>();
    Local<Uint8Array> commitment_array = info[2].As<Uint8Array>();
    Local<Uint8Array> secret_array = info[3].As<Uint8Array>();
    Local<Uint8Array> keys_array = info[4].As<Uint8Array>();
    uint32_t num_cosigners = To<uint32_t>(info[5]).FromJust();
    Local<Uint8Array> pubkey_array = info[6].As<Uint8Array>();
    Local<Uint8Array> seckey_array = info[7].As<Uint8Array>();
    uint32_t msglen = message_array->Length();

#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    uint8_t* out = (uint8_t*) out_array->Buffer()->GetBackingStore()->Data();
    uint8_t* msg = (uint8_t*) message_array->Buffer()->GetBackingStore()->Data();
    uint8_t* commitment = (uint8_t*) commitment_array->Buffer()->GetBackingStore()->Data();
    uint8_t* secret = (uint8_t*) secret_array->Buffer()->GetBackingStore()->Data();
    uint8_t* pubkeys = (uint8_t*) keys_array->Buffer()->GetBackingStore()->Data();
    uint8_t* pubkey = (uint8_t*) pubkey_array->Buffer()->GetBackingStore()->Data();
    uint8_t* seckey = (uint8_t*) seckey_array->Buffer()->GetBackingStore()->Data();
#else
    uint8_t* out = (uint8_t*) out_array->Buffer()->GetContents().Data();
    uint8_t* msg = (uint8_t*) message_array->Buffer()->GetContents().Data();
    uint8_t* commitment = (uint8_t*) commitment_array->Buffer()->GetContents().Data();
    uint8_t* secret = (uint8_t*) secret_array->Buffer()->GetContents().Data();
    uint8_t* pubkeys = (uint8_t*) keys_array->Buffer()->GetContents().Data();
    uint8_t* pubkey = (uint8_t*) pubkey_array->Buffer()->GetContents().Data();
    uint8_t* seckey = (uint8_t*) seckey_array->Buffer()->GetContents().Data();
#endif

    info.GetReturnValue().Set(New<Number>(secp256k1_partial_sign(out, msg, msglen, commitment, secret, pubkeys, num_cosigners, pubkey, seckey)));
}

NAN_METHOD(node_secp256k1_create_commitment) {
    Local<Uint8Array> out_secret_array = info[0].As<Uint8Array>();
    Local<Uint8Array> out_commitment_array = info[1].As<Uint8Array>();
    Local<Uint8Array> in_array = info[2].As<Uint8Array>();
    size_t len = out_commitment_array->Length();

#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    uint8_t* out_secret = (uint8_t*) out_secret_array->Buffer()->GetBackingStore()->Data();
    uint8_t* out_commitment = (uint8_t*) out_commitment_array->Buffer()->GetBackingStore()->Data();
    uint8_t* in = (uint8_t*) in_array->Buffer()->GetBackingStore()->Data();
#else
    uint8_t* out_secret = (uint8_t*) out_secret_array->Buffer()->GetContents().Data();
    uint8_t* out_commitment = (uint8_t*) out_commitment_array->Buffer()->GetContents().Data();
    uint8_t* in = (uint8_t*) in_array->Buffer()->GetContents().Data();
#endif
     info.GetReturnValue().Set(New<Number>(secp256k1_create_commitment(out_secret, out_commitment, len, in)));
}

NAN_METHOD(node_secp256k1_aggregate_commitments) {
    Local<Uint8Array> out_array = info[0].As<Uint8Array>();
    Local<Uint8Array> in_array = info[1].As<Uint8Array>();
    uint32_t num_cmt = To<uint32_t>(info[2]).FromJust();
    uint32_t length = To<uint32_t>(info[3]).FromJust();

#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    uint8_t* out = (uint8_t*) out_array->Buffer()->GetBackingStore()->Data();
    uint8_t* in = (uint8_t*) in_array->Buffer()->GetBackingStore()->Data();
#else
    uint8_t* out = (uint8_t*) out_array->Buffer()->GetContents().Data();
    uint8_t* in = (uint8_t*) in_array->Buffer()->GetContents().Data();
#endif
    info.GetReturnValue().Set(New<Number>(secp256k1_aggregate_commitments(out, in, num_cmt, length)));
}

NAN_METHOD(node_secp256k1_add_scalars) {
    Local<Uint8Array> out_array = info[0].As<Uint8Array>();
    Local<Uint8Array> a_array = info[1].As<Uint8Array>();
    Local<Uint8Array> b_array = info[2].As<Uint8Array>();
#if (V8_MAJOR_VERSION >= 10 && V8_MINOR_VERSION >= 1)
    uint8_t* out = (uint8_t*) out_array->Buffer()->GetBackingStore()->Data();
    uint8_t* a = (uint8_t*) a_array->Buffer()->GetBackingStore()->Data();
    uint8_t* b = (uint8_t*) b_array->Buffer()->GetBackingStore()->Data();
#else
    uint8_t* out = (uint8_t*) out_array->Buffer()->GetContents().Data();
    uint8_t* a = (uint8_t*) a_array->Buffer()->GetContents().Data();
    uint8_t* b = (uint8_t*) b_array->Buffer()->GetContents().Data();
#endif

    info.GetReturnValue().Set(New<Number>(secp256k1_add_scalars(out, a, b)));
}

NAN_MODULE_INIT(Init) {
    Set(target, New<String>("node_argon2_target_async").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_argon2_target_async)).ToLocalChecked());
    Set(target, New<String>("node_sha256").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_sha256)).ToLocalChecked());
    Set(target, New<String>("node_sha512").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_sha512)).ToLocalChecked());
    Set(target, New<String>("node_blake2").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_blake2)).ToLocalChecked());
    Set(target, New<String>("node_argon2").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_argon2)).ToLocalChecked());
    Set(target, New<String>("node_argon2_async").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_argon2_async)).ToLocalChecked());
    Set(target, New<String>("node_ed25519_public_key_derive").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_ed25519_public_key_derive)).ToLocalChecked());
    Set(target, New<String>("node_ed25519_hash_public_keys").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_ed25519_hash_public_keys)).ToLocalChecked());
    Set(target, New<String>("node_ed25519_delinearize_public_key").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_ed25519_delinearize_public_key)).ToLocalChecked());
    Set(target, New<String>("node_ed25519_aggregate_delinearized_public_keys").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_ed25519_aggregate_delinearized_public_keys)).ToLocalChecked());
    Set(target, New<String>("node_ed25519_add_scalars").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_ed25519_add_scalars)).ToLocalChecked());
    Set(target, New<String>("node_ed25519_sign").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_ed25519_sign)).ToLocalChecked());
    Set(target, New<String>("node_ed25519_verify").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_ed25519_verify)).ToLocalChecked());
    Set(target, New<String>("node_kdf_legacy").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_kdf_legacy)).ToLocalChecked());
    Set(target, New<String>("node_kdf").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_kdf)).ToLocalChecked());
    Set(target, New<String>("node_ed25519_aggregate_commitments").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_ed25519_aggregate_commitments)).ToLocalChecked());
    Set(target, New<String>("node_ed25519_create_commitment").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_ed25519_create_commitment)).ToLocalChecked());
    Set(target, New<String>("node_ed25519_derive_delinearized_private_key").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_ed25519_derive_delinearized_private_key)).ToLocalChecked());
    Set(target, New<String>("node_ed25519_delinearized_partial_sign").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_ed25519_delinearized_partial_sign)).ToLocalChecked());
    Set(target, New<String>("node_ripemd160").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_ripemd160)).ToLocalChecked());
    Set(target, New<String>("node_keccak256").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_keccak256)).ToLocalChecked());
    Set(target, New<String>("node_secp256k1_ctx_init").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_secp256k1_ctx_init)).ToLocalChecked());
    Set(target, New<String>("node_secp256k1_ctx_release").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_secp256k1_ctx_release)).ToLocalChecked());
    Set(target, New<String>("node_secp256k1_seckey_verify").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_secp256k1_seckey_verify)).ToLocalChecked());
    Set(target, New<String>("node_secp256k1_pubkey_create").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_secp256k1_pubkey_create)).ToLocalChecked());
    Set(target, New<String>("node_secp256k1_pubkey_verify").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_secp256k1_pubkey_verify)).ToLocalChecked());
    Set(target, New<String>("node_secp256k1_pubkey_compress").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_secp256k1_pubkey_compress)).ToLocalChecked());
    Set(target, New<String>("node_secp256k1_pubkey_decompress").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_secp256k1_pubkey_decompress)).ToLocalChecked());
    Set(target, New<String>("node_secp256k1_sign").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_secp256k1_sign)).ToLocalChecked());
    Set(target, New<String>("node_secp256k1_verify").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_secp256k1_verify)).ToLocalChecked());
    Set(target, New<String>("node_secp256k1_sign_compact").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_secp256k1_sign_compact)).ToLocalChecked());
    Set(target, New<String>("node_secp256k1_sign_compact_verify").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_secp256k1_sign_compact_verify)).ToLocalChecked());
    Set(target, New<String>("node_secp256k1_schnorr_sign").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_secp256k1_schnorr_sign)).ToLocalChecked());
    Set(target, New<String>("node_secp256k1_schnorr_verify").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_secp256k1_schnorr_verify)).ToLocalChecked());
    Set(target, New<String>("node_secp256k1_hash_pubkeys").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_secp256k1_hash_pubkeys)).ToLocalChecked());
    Set(target, New<String>("node_secp256k1_delinearize_pubkey").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_secp256k1_delinearize_pubkey)).ToLocalChecked());
    Set(target, New<String>("node_secp256k1_aggregate_delinearized_publkeys").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_secp256k1_aggregate_delinearized_publkeys)).ToLocalChecked());
    Set(target, New<String>("node_secp256k1_derive_delinearized_seckey").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_secp256k1_derive_delinearized_seckey)).ToLocalChecked());
    Set(target, New<String>("node_secp256k1_partial_sign").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_secp256k1_partial_sign)).ToLocalChecked());
    Set(target, New<String>("node_secp256k1_create_commitment").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_secp256k1_create_commitment)).ToLocalChecked());
    Set(target, New<String>("node_secp256k1_aggregate_commitments").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_secp256k1_aggregate_commitments)).ToLocalChecked());
    Set(target, New<String>("node_secp256k1_add_scalars").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(node_secp256k1_add_scalars)).ToLocalChecked());
}

NODE_MODULE(krypton_node, Init)
