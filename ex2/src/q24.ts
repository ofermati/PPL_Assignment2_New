import {
  CExp,
  DictExp,
  Exp,
  Program,
  isDictExp,
  isAppExp,
  isBoolExp,
  isNumExp,
  isStrExp,
  isVarRef,
  isLitExp,
  isPrimOp,
  isIfExp,
  isProcExp,
  isDefineExp,
  makeAppExp,
  makeDefineExp,
  makeLitExp,
  makeProcExp,
  makeProgram,
  makeVarDecl,
  makeVarRef,
  makeIfExp,
  makePrimOp,
} from './L32/L32-ast';

import {
  makeSymbolSExp,
  makeEmptySExp,
  makeCompoundSExp,
  SExpValue,
} from './L32/L32-value';


// === Helper: Convert CExp to S-expression ===
const toSExpValue = (expr: CExp): SExpValue => {
  if (isNumExp(expr) || isBoolExp(expr) || isStrExp(expr))
    return expr.val;

  if (isVarRef(expr)) return makeSymbolSExp(expr.var);
  if (isLitExp(expr)) return expr.val;
  if (isPrimOp(expr)) return makeSymbolSExp(expr.op);

  if (isAppExp(expr)) {
    const parts = [expr.rator, ...expr.rands].map(toSExpValue);
    return parts.reduceRight<SExpValue>(
      (rest, current) => makeCompoundSExp(current, rest),
      makeEmptySExp()
    );
  }

  if (isProcExp(expr)) {
    const lambda = makeSymbolSExp('lambda');
    const argList = expr.args
      .map(param => makeSymbolSExp(param.var))
      .reduceRight<SExpValue>(
        (rest, current) => makeCompoundSExp(current, rest),
        makeEmptySExp()
      );
    const bodyList = expr.body.map(toSExpValue);
    return [lambda, argList, ...bodyList].reduceRight<SExpValue>(
      (rest, current) => makeCompoundSExp(current, rest),
      makeEmptySExp()
    );
  }

  if (isDictExp(expr)) {
    const dictTag = makeSymbolSExp('dict');
    const pairs = expr.entries.map(pair => {
      const key = makeSymbolSExp(pair[0].val);
      const value = toSExpValue(pair[1]);
      return makeCompoundSExp(key, makeCompoundSExp(value, makeEmptySExp()));
    });
    return [dictTag, ...pairs].reduceRight<SExpValue>(
      (rest, current) => makeCompoundSExp(current, rest),
      makeEmptySExp()
    );
  }

  return makeSymbolSExp(expr.toString());
};


// === Step 2: DictExp → AppExp(dict '((k . v) ...)) ===
const dictToAppExp = (d: DictExp): CExp => {
  const quotedPairs = d.entries.reduceRight<SExpValue>(
    (rest, pair) =>
      makeCompoundSExp(
        makeCompoundSExp(
          makeSymbolSExp(pair[0].val),
          toSExpValue(pair[1])
        ),
        rest
      ),
    makeEmptySExp()
  );
  return makeAppExp(makeVarRef('dict'), [makeLitExp(quotedPairs)]);
};


// === Step 3: recursively rewrite CExp ===
const transformCExp = (expr: CExp): CExp =>
  isNumExp(expr) || isBoolExp(expr) || isStrExp(expr) ||
  isVarRef(expr) || isLitExp(expr) || isPrimOp(expr)
    ? expr
    : isIfExp(expr)
    ? makeIfExp(
        transformCExp(expr.test),
        transformCExp(expr.then),
        transformCExp(expr.alt)
      )
    : isProcExp(expr)
    ? makeProcExp(expr.args, expr.body.map(transformCExp))
    : isAppExp(expr)
    ? isDictExp(expr.rator)
      ? makeAppExp(dictToAppExp(expr.rator), [transformCExp(expr.rands[0])])
      : makeAppExp(transformCExp(expr.rator), expr.rands.map(transformCExp))
    : isDictExp(expr)
    ? dictToAppExp(expr)
    : expr;


// === Step 4: Rewrite top-level Exp ===
const transformExp = (expr: Exp): Exp =>
  isDefineExp(expr)
    ? makeDefineExp(expr.var, transformCExp(expr.val))
    : transformCExp(expr);


// === Step 5: Exported transformation ===
export const Dict2App = (prog: Program): Program =>
  makeProgram(prog.exps.map(transformExp));


// === Step 6: Exported L32 → L3 conversion ===
export const L32toL3 = (prog: Program): Program => {
  const dictDef = makeDefineExp(
    makeVarDecl('dict'),
    makeProcExp(
      [makeVarDecl('pairs')],
      [
        makeProcExp(
          [makeVarDecl('k')],
          [
            makeIfExp(
              makeAppExp(makePrimOp('eq?'), [
                makeAppExp(makePrimOp('car'), [
                  makeAppExp(makePrimOp('car'), [makeVarRef('pairs')])
                ]),
                makeVarRef('k')
              ]),
              makeAppExp(makePrimOp('cdr'), [
                makeAppExp(makePrimOp('car'), [makeVarRef('pairs')])
              ]),
              makeAppExp(
                makeAppExp(makeVarRef('dict'), [
                  makeAppExp(makePrimOp('cdr'), [makeVarRef('pairs')])
                ]),
                [makeVarRef('k')]
              )
            )
          ]
        )
      ]
    )
  );

  return makeProgram([dictDef, ...Dict2App(prog).exps]);
};
