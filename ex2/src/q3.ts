/*
;; =============================================================================
;; L2 → JavaScript Unparser
;;
;; Contract
;;   l2ToJS : (Program | Exp) → Result<string>
;;
;;   Traverses an L2 abstract​‑syntax tree and produces an equivalent
;;   JavaScript source string, following the same “big pattern match”
;;   style used in `unparseL3` from the course materials.
;;
;;   Primitive​‑operator mapping (app expression):
;;     +  -  *  /           ⇒ infix   +  -  *  /
;;     <  >                 ⇒ infix   <  >
;;     =  eq?               ⇒ infix   ===
;;     and  or  not         ⇒ &&  ||  !
;;     number?  boolean?    ⇒ typeof checks
;;
;;   Grammar subset handled (L2):
;;     <program> ::= (L2 <exp>+)
;;     <exp>     ::= <define> | <cexp>
;;     <define>  ::= (define <var> <cexp>)
;;     <cexp> ::= <number> | <boolean> | <string>
;;             |  (lambda (<var>*) <cexp>)
;;             |  (if <cexp> <cexp> <cexp>)
;;             |  (<cexp> <cexp>* )
;;
;;   Any unsupported AST tag triggers an exception that is captured and
;;   returned via `makeFailure`.
;; =============================================================================
*/

import {
  Exp,
  Program,
  BoolExp,
  NumExp,
  StrExp,
  VarRef,
  ProcExp,
  IfExp,
  AppExp,
  PrimOp,
  DefineExp,
  isBoolExp,
  isNumExp,
  isStrExp,
  isVarRef,
  isProcExp,
  isIfExp,
  isAppExp,
  isPrimOp,
  isDefineExp,
  isProgram,
} from './L3/L3-ast';

import { Result, makeOk, makeFailure } from './shared/result';

/*
Purpose: Transform an L2 AST (Exp | Program) to a JavaScript source string.
Signature: l2ToJS(ast)
Type: [Exp | Program] => Result<string>
*/

export const l2ToJS = (exp: Exp | Program): Result<string> => {
try {
  return makeOk(unparseL2JS(exp));
} catch (e) {
  return makeFailure(`l2ToJS – ${e}`);
}
};

// -----------------------------------------------------------------------------
//               Internal unparser (mirrors the style of unparseL3)
// -----------------------------------------------------------------------------

const unparseL2JS = (exp: Program | Exp): string =>
isBoolExp(exp)
  ? (exp.val ? 'true' : 'false')
  : isNumExp(exp)
  ? `${exp.val}`
  : isStrExp(exp)
  ? JSON.stringify(exp.val)
  : isVarRef(exp)
  ? exp.var
  : isProcExp(exp)
  ? `(${unparseProcExp(exp)})`
  : isIfExp(exp)
  ? `(${unparseL2JS(exp.test)} ? ${unparseL2JS(exp.then)} : ${unparseL2JS(exp.alt)})`
  : isAppExp(exp)
  ? unparseAppExp(exp)
  : isPrimOp(exp)
  ? primOpToJS(exp.op)
  : isDefineExp(exp)
  ? `const ${exp.var.var} = ${unparseL2JS(exp.val)}`
  : isProgram(exp)
  ? exp.exps.map(unparseL2JS).join(';\n')
  : (() => {
      throw new Error(`Unsupported AST node: ${JSON.stringify(exp)}`);
    })();

// -----------------------------------------------------------------------------
//                               Helpers
// -----------------------------------------------------------------------------

const unparseProcExp = (pe: ProcExp): string =>
`(${pe.args.map((p) => p.var).join(',')}) => ${pe.body.length === 1 ? unparseL2JS(pe.body[0]) : `(${pe.body.map(unparseL2JS).join(' ; ')})`}`;

const unparseAppExp = (ae: AppExp): string => {
if (isPrimOp(ae.rator)) {
  return primAppToJS(ae.rator.op, ae.rands.map(unparseL2JS));
}
const ratorJS = unparseL2JS(ae.rator);
return `${ratorJS}(${ae.rands.map(unparseL2JS).join(',')})`;
};

const needsParens = (exp: Exp): boolean =>
isProcExp(exp) || isIfExp(exp) || (isAppExp(exp) && !isPrimOp(exp.rator));

// -----------------------------------------------------------------------------
//                        Primitive operators handling
// -----------------------------------------------------------------------------

const primOpToJS = (op: string): string => {
switch (op) {
  case '=':
  case 'eq?':
    return '===';
  case 'and':
    return '&&';
  case 'or':
    return '||';
  case 'not':
    return '!';
  default:
    return op;
}
};

const primAppToJS = (op: string, args: string[]): string => {
switch (op) {
  case '+':
  case '-':
  case '*':
  case '/':
  case '<':
  case '>':
    return `(${args.join(` ${op} `)})`;
  case '=':
  case 'eq?':
    return `(${args[0]} === ${args[1]})`;
  case 'and':
    return `(${args.join(' && ')})`;
  case 'or':
    return `(${args.join(' || ')})`;
  case 'not':
    return `(!${args[0]})`;
  case 'number?':
    return `(typeof ${args[0]} === 'number')`;
  case 'boolean?':
    return `(typeof ${args[0]} === 'boolean')`;
  default:
    return `${op}(${args.join(',')})`;
}
};
