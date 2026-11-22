# tiny-stack-vm-01

A VM for make.fun's tiny stack ISA (version 1), a faithful port of the kit's reference VM
(`generator/subject/vm.mjs`); where prose and that file disagree, that file is the rule.

## Run

    node main.ts                 # reads /input/<id>/, writes /output/<id>/
    node main.ts in-dir out-dir   # same, on any two directories

For each `i001`..`i040` under the input directory it writes `stdout.bin` (the exact bytes the
program wrote) and `exit.txt` (the exit code in decimal plus a newline), creating the output
directory itself. Exit code is the program's own `EXIT`, `HALT`'s 0, or the trap's code.

## Behaviour

32-bit two's-complement values; `MUL` via `Math.imul`; `DIV`/`MOD` signed and truncating
(`INT_MIN / -1 = INT_MIN`, `x % -1 = 0`), `DIVU`/`MODU`/`LTU` on unsigned operands; shift counts
masked to 5 bits; `PUSH8` sign-extended; `EXIT` takes the low byte. Bounds: stack 256 (trap 3,
underflow 2), calls 64 (7, empty `RET` 8), memory 256 words (6), 1,000,000 steps (10), 65,536
output bytes (11, writing none of the bytes that would overflow); unknown opcode 5, `pc` outside
the program or a cut-off immediate 9. A trap keeps the output written before it.

Node 22, built-in modules only, no network, no clock or environment: deterministic, and the whole
practice set runs in well under a second.

## Test

    node main.ts <kit>/practice/input /tmp/out

Expected bytes are in `<kit>/practice/reference/manifest.json`.

MIT (see LICENSE).
