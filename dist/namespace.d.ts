import _Krypton from './types';

export as namespace Krypton;
export = _Krypton;

declare global {
    const Krypton: typeof _Krypton;
}
