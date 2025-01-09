#include "util.h"

void WriteLE32(unsigned char* ptr, unsigned int x) {
  unsigned int v = htole32(x);
  memcpy(ptr, (char*)&v, 4);
}

void memzero(void *const pnt, const size_t len) {
  volatile unsigned char *volatile pnt_ = (volatile unsigned char *volatile)pnt;
  size_t i = (size_t)0U;

  while (i < len) {
    pnt_[i++] = 0U;
  }
}
