#ifndef _NATIVE_UTIL_H
#define _NATIVE_UTIL_H

#include <string.h>
#include "endian.h"

void WriteLE32(unsigned char* ptr, unsigned int x);

void memzero(void *const pnt, const size_t len);

#endif // _NATIVE_UTIL_H
