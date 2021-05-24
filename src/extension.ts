import vscode from 'vscode';

interface SignatureConfig
  extends Omit<vscode.SignatureInformation, 'parameters'> {
  parameterGroups: vscode.ParameterInformation[][];
}

const boxSignatureParams: vscode.ParameterInformation[][] = [
  [{ label: 'all' }],
  [{ label: 'vertical' }, { label: 'horizontal' }],
  [{ label: 'top' }, { label: 'horizontal' }, { label: 'bottom' }],
  [
    { label: 'top' },
    { label: 'right' },
    { label: 'bottom' },
    { label: 'left' },
  ],
];

const signatures: SignatureConfig[] = [
  {
    label: 'padding',
    documentation:
      'The padding CSS shorthand property sets the padding area on all four sides of an element at once.',
    parameterGroups: boxSignatureParams,
  },
  {
    label: 'margin',
    documentation:
      'The margin CSS property sets the margin area on all four sides of an element. It is a shorthand for margin-top, margin-right, margin-bottom, and margin-left.',
    parameterGroups: boxSignatureParams,
  },
];

class CustomSignatureProvider implements vscode.SignatureHelpProvider {
  provideSignatureHelp(
    document: vscode.TextDocument,
    position: vscode.Position
  ) {
    const line = document.lineAt(position.line);
    const { text } = line;

    const matches = [...text.matchAll(/[^\s:;]+|\s$/g)] as (RegExpMatchArray & {
      [key: number]: any;
      index: number;
      input: string;
    })[];
    const [[propertyName], ...params] = matches;

    const matchedSignatures = signatures.filter(
      ({ label, parameterGroups: parameters }) =>
        label.startsWith(propertyName) &&
        parameters.find((pg) => pg.length <= params.length)
    );

    if (matchedSignatures.length === 0) {
      return null;
    }

    const signatureHelp = new vscode.SignatureHelp();

    const expanded: vscode.SignatureInformation[] = [];
    matchedSignatures.forEach((sig) =>
      sig.parameterGroups.forEach((parameters) =>
        expanded.push({
          ...sig,
          label: `${sig.label}: <${parameters
            .map((p) => p.label)
            .join(' | ')}>`,
          parameters,
        })
      )
    );
    signatureHelp.signatures.push(...expanded);

    const closestSignature = expanded.findIndex(
      (s) => s.parameters.length === params.length
    );
    if (closestSignature) {
      // TODO: clean this up
      signatureHelp.activeSignature = closestSignature;
      const curPos = position.character;

      const textFromCurPos = [...text].slice(curPos);
      const textToCurPos = [...text].slice(0, curPos + 1).reverse();

      const findClosestSpace = (char: string): boolean => char === ' ';

      const curWordStart =
        curPos + 1 - textToCurPos.findIndex(findClosestSpace);

      const curWordEndLookup = textFromCurPos.findIndex(findClosestSpace);
      const curWordEnd =
        (curWordEndLookup === -1 ? 0 : curWordEndLookup) + curPos;

      if (curPos) {
        const closestParam = [...params].findIndex(
          (param) =>
            (curPos === line.range.end.character &&
              param.index === curPos + 1) ||
            (param.index <= curWordStart &&
              curWordEnd <= param.index + param[0].length)
        );
        signatureHelp.activeParameter = closestParam;
      }
    }

    return signatureHelp;
  }
}

export function activate(context: vscode.ExtensionContext) {
  const cssSignatureProvider = vscode.languages.registerSignatureHelpProvider(
    ['css', 'scss', 'sass', 'less'],
    new CustomSignatureProvider(),
    ' '
  );

  context.subscriptions.push(cssSignatureProvider);
}
