import {
    Program, Exp, CExp, Binding,
    makeProgram, makeDefineExp, makeAppExp, makeVarRef, makeLitExp,
    isDefineExp, isAppExp, isIfExp, isProcExp, isLetExp, isLitExp,
    isDictExp, isNumExp, isBoolExp, isStrExp
  } from './L32/L32-ast';
  
  import {
    SExpValue, makeCompoundSExp, makeEmptySExp
  } from './L32/L32-value';
  
  /* ✧ פונקציה עזר: ממירה מערך ל־S-Exp Chain (כמו '(x y z)) ✧ */
  const listToSExp = (elts: SExpValue[]): SExpValue =>
    elts.reduceRight(
      (cdr, car) => makeCompoundSExp(car, cdr),
      makeEmptySExp()
    );
  
  /* ✧ פונקציה עזר: ממירה ערך ליטרלי לביטוי SExpValue ✧ */
  const cexpToSExp = (ce: CExp): SExpValue =>
    isNumExp(ce) || isBoolExp(ce) || isStrExp(ce) ? ce.val :
    isLitExp(ce) ? ce.val :
    (() => { throw new Error('Dict2App supports only literal values inside dict'); })();
  
  /* ✧ פונקציה לשכתוב DictExp ל־AppExp ✧ */
  const rewriteDict = (ce: CExp): CExp =>
    isDictExp(ce)
      ? makeAppExp(
          makeVarRef('dict'),
          [makeLitExp(
            listToSExp(
              ce.entries.map(
                ([k, v]) => makeCompoundSExp(k, v)
              )
            )
          )]
        )
      : ce;
  
  /* ✧ פונקציה לשכתוב AppExp ✧ */
  const rewriteApp = (ce: CExp): CExp =>
    isAppExp(ce)
      ? makeAppExp(rewriteCExp(ce.rator), ce.rands.map(rewriteCExp))
      : ce;
  
  /* ✧ פונקציה לשכתוב IfExp ✧ */
  const rewriteIf = (ce: CExp): CExp =>
    isIfExp(ce)
      ? { ...ce,
          test: rewriteCExp(ce.test),
          then: rewriteCExp(ce.then),
          alt: rewriteCExp(ce.alt)
        }
      : ce;
  
  /* ✧ פונקציה לשכתוב ProcExp ✧ */
  const rewriteProc = (ce: CExp): CExp =>
    isProcExp(ce)
      ? { ...ce, body: ce.body.map(rewriteCExp) }
      : ce;
  
  /* ✧ פונקציה לשכתוב LetExp ✧ */
  const rewriteLet = (ce: CExp): CExp =>
    isLetExp(ce)
      ? { ...ce,
          bindings: ce.bindings.map(
            (b: Binding) => ({ ...b, val: rewriteCExp(b.val) })
          ),
          body: ce.body.map(rewriteCExp)
        }
      : ce;
  
  /* ✧ הפונקציה הראשית לשכתוב CExp ✧ */
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
  
  /* ✧ שכתוב תכנית שלמה ✧ */
  export const Dict2App = (prog: Program): Program =>
    makeProgram(
      prog.exps.map((e: Exp) =>
        isDefineExp(e)
          ? makeDefineExp(e.var, rewriteCExp(e.val))
          : rewriteCExp(e as CExp)
      )
    );
  
  /* ✧ ל־2.5.b – כרגע עדיין ריק ✧ */
  export const L32toL3 = (_prog: Program): Program =>
        Dict2App(_prog);
  