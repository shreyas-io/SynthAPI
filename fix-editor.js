const fs = require('fs');
const file = '/home/shreyas/Projects/mock-stack/web-apps/apps/web/src/features/rule-tree-editor/components/RuleTreeEditor.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'newPreds.splice(insertIndex, 0, itemToInsert);',
  'newPreds.splice(insertIndex, 0, itemToInsert as PredicateBox);'
);

code = code.replace(
  'newChildren.splice(insertIndex, 0, itemToInsert);',
  'newChildren.splice(insertIndex, 0, itemToInsert as RuleBox);'
);

fs.writeFileSync(file, code);
