import {
  Program, Exp, CExp, Binding,
  makeProgram, makeDefineExp, makeAppExp, makeVarRef, makeLitExp,
  isDefineExp, isAppExp, isIfExp, isProcExp, isLetExp, isLitExp,
  isDictExp, isNumExp, isBoolExp, isStrExp,
  isVarRef,
  VarRef
} from './L32/L32-ast';

import {
  SExpValue, makeCompoundSExp, makeEmptySExp,
  makeSymbolSExp, isSymbolSExp
} from './L32/L32-value';

const listToSExp = (elts: SExpValue[]): SExpValue =>
  elts.reduceRight(
    (cdr, car) => makeCompoundSExp(car, cdr),
    makeEmptySExp()
  );

const cexpToSExp = (ce: CExp): SExpValue =>
  isNumExp(ce) || isBoolExp(ce) || isStrExp(ce) ? ce.val :
  isLitExp(ce) ? ce.val :
  (() => { throw new Error('Dict2App supports only literal values inside dict'); })();

const rewriteDict = (ce: CExp): CExp =>
  isDictExp(ce)
    ? makeAppExp(
        makeVarRef('dict'),
        [makeLitExp(
          listToSExp(
            ce.entries.map(([k, v]) => {
              let keySym;
              if (isVarRef(k)) {
                keySym = makeSymbolSExp((k as VarRef).var);
              } else if (isLitExp(k) && isSymbolSExp(k.val)) {
                keySym = k.val;
              } else {
                throw new Error('Dict key must be a VarRef or a literal symbol');
              }

              return makeCompoundSExp(
                keySym,
                cexpToSExp(v)
              );
            })
          )
        )]
      )
    : ce;

const rewriteApp = (ce: CExp): CExp =>
  isAppExp(ce)
    ? makeAppExp(rewriteCExp(ce.rator), ce.rands.map(rewriteCExp))
    : ce;

const rewriteIf = (ce: CExp): CExp =>
  isIfExp(ce)
    ? { ...ce,
        test: rewriteCExp(ce.test),
        then: rewriteCExp(ce.then),
        alt: rewriteCExp(ce.alt)
      }
    : ce;

const rewriteProc = (ce: CExp): CExp =>
  isProcExp(ce)
    ? { ...ce, body: ce.body.map(rewriteCExp) }
    : ce;

const rewriteLet = (ce: CExp): CExp =>
  isLetExp(ce)
    ? { ...ce,
        bindings: ce.bindings.map(
          (b: Binding) => ({ ...b, val: rewriteCExp(b.val) })
        ),
        body: ce.body.map(rewriteCExp)
      }
    : ce;

const rewriteCExp = (ce: CExp): CExp =>
  rewriteLet(
    rewriteProc(
      rewriteIf(
        rewriteApp(
          rewriteDict(ce)
        )
      )
    )
  );

export const Dict2App = (prog: Program): Program =>
  makeProgram(
    prog.exps.map((e: Exp) =>
      isDefineExp(e)
        ? makeDefineExp(e.var, rewriteCExp(e.val))
        : rewriteCExp(e as CExp)
    )
  );

export const L32toL3 = (_prog: Program): Program =>
      Dict2App(_prog);
