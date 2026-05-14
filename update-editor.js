const fs = require('fs');
const file = '/home/shreyas/Projects/mock-stack/web-apps/apps/web/src/features/rule-tree-editor/components/RuleTreeEditor.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  `type DraggedBox =
  | { type: "predicate_template"; template: PredicateTemplate }
  | { type: "rule_template"; ruleType: RuleBox["type"] };`,
  `type DraggedBox =
  | { type: "predicate_template"; template: PredicateTemplate }
  | { type: "rule_template"; ruleType: RuleBox["type"] }
  | { type: "existing_predicate"; predicateId: string }
  | { type: "existing_rule"; ruleId: string };`
);

code = code.replace(
  `const findPredicate = (rule: RuleBox, predicateId: string): PredicateBox | null => {`,
  `const removePredicate = (rule: RuleBox, predicateId: string): RuleBox => ({
  ...rule,
  predicates: rule.predicates.filter((predicate) => predicate.id !== predicateId),
  children: rule.children.map((child) => removePredicate(child, predicateId)),
});

const findParentRule = (rule: RuleBox, childId: string, type: "predicate" | "rule"): RuleBox | null => {
  if (type === "predicate" && rule.predicates.some((p) => p.id === childId)) return rule;
  if (type === "rule" && rule.children.some((c) => c.id === childId)) return rule;

  for (const child of rule.children) {
    const found = findParentRule(child, childId, type);
    if (found) return found;
  }

  return null;
};

const findPredicate = (rule: RuleBox, predicateId: string): PredicateBox | null => {`
);

const oldDropLogic = `  const dropOnRule = (targetRuleId: string) => {
    const box = draggedBox;

    if (!box) {
      const childRule = createRule("and");
      setTree((current) =>
        updateRule(current, targetRuleId, (rule) => ({
          ...rule,
          children: [...rule.children, childRule],
        })),
      );
      setSelected({ type: "rule", ruleId: childRule.id });
      return;
    }

    if (box.type === "predicate_template") {
      const predicate = createPredicate(box.template);
      setTree((current) =>
        updateRule(current, targetRuleId, (rule) => ({
          ...rule,
          predicates: [...rule.predicates, predicate],
        })),
      );
      setSelected({ type: "predicate", predicateId: predicate.id });
      setDraggedBox(null);
      return;
    }

    if (box.type === "rule_template") {
      const childRule = createRule(box.ruleType);
      setTree((current) =>
        updateRule(current, targetRuleId, (rule) => ({
          ...rule,
          children: [...rule.children, childRule],
        })),
      );
      setSelected({ type: "rule", ruleId: childRule.id });
      setDraggedBox(null);
      return;
    }

  };`;

const newDropLogic = `  const handleDrop = (targetRuleId: string, targetType: "predicate" | "rule" | "end", targetIndex?: number) => {
    const box = draggedBox;
    
    if (!box) {
      const childRule = createRule("and");
      setTree((current) =>
        updateRule(current, targetRuleId, (rule) => ({
          ...rule,
          children: [...rule.children, childRule],
        })),
      );
      setSelected({ type: "rule", ruleId: childRule.id });
      return;
    }

    setTree((currentTree) => {
      let newTree = currentTree;
      let itemToInsert = null;
      let itemType = null;
      let actualTargetIndex = targetIndex;

      if (box.type === "predicate_template") {
        itemToInsert = createPredicate(box.template);
        itemType = "predicate";
      } else if (box.type === "rule_template") {
        itemToInsert = createRule(box.ruleType);
        itemType = "rule";
      } else if (box.type === "existing_predicate") {
        const predicate = findPredicate(currentTree, box.predicateId);
        const parent = findParentRule(currentTree, box.predicateId, "predicate");
        if (predicate) {
          itemToInsert = predicate;
          itemType = "predicate";
          if (parent?.id === targetRuleId && targetIndex !== undefined) {
            const currentIndex = parent.predicates.findIndex((p) => p.id === box.predicateId);
            if (currentIndex !== -1 && currentIndex < targetIndex) {
              actualTargetIndex = targetIndex - 1;
            }
          }
          newTree = removePredicate(newTree, box.predicateId);
        }
      } else if (box.type === "existing_rule") {
        const targetRule = findRule(currentTree, targetRuleId);
        const draggedRule = findRule(currentTree, box.ruleId);
        
        if (box.ruleId === targetRuleId || (draggedRule && findRule(draggedRule, targetRuleId))) {
          return currentTree;
        }

        if (draggedRule) {
          itemToInsert = draggedRule;
          itemType = "rule";
          const parent = findParentRule(currentTree, box.ruleId, "rule");
          if (parent?.id === targetRuleId && targetIndex !== undefined) {
            const currentIndex = parent.children.findIndex((c) => c.id === box.ruleId);
            if (currentIndex !== -1 && currentIndex < targetIndex) {
              actualTargetIndex = targetIndex - 1;
            }
          }
          newTree = removeRule(newTree, box.ruleId);
        }
      }

      if (!itemToInsert || !itemType) return currentTree;

      newTree = updateRule(newTree, targetRuleId, (rule) => {
        const insertIndex = actualTargetIndex !== undefined 
            ? actualTargetIndex 
            : (itemType === "predicate" ? rule.predicates.length : rule.children.length);

        if (itemType === "predicate") {
          const newPreds = [...rule.predicates];
          newPreds.splice(insertIndex, 0, itemToInsert);
          return { ...rule, predicates: newPreds };
        } else {
          const newChildren = [...rule.children];
          newChildren.splice(insertIndex, 0, itemToInsert);
          return { ...rule, children: newChildren };
        }
      });

      if (itemType === "predicate") {
        setTimeout(() => setSelected({ type: "predicate", predicateId: itemToInsert.id }), 0);
      } else {
        setTimeout(() => setSelected({ type: "rule", ruleId: itemToInsert.id }), 0);
      }

      return newTree;
    });

    setDraggedBox(null);
  };`;

code = code.replace(oldDropLogic, newDropLogic);

const ruleTreeNodeStart = `function RuleTreeNode({
  rule,
  isRoot,
  selected,
  draggedBox,
  onSelect,
  onChangeRule,
  onRemoveRule,
  onDropRule,
}: {`;

const newRuleTreeNodeStart = `function DropZone({
  draggedBox,
  onDrop,
}: {
  draggedBox: DraggedBox | null;
  onDrop: () => void;
}) {
  const isActive = !!draggedBox;
  if (!isActive) return null;

  return (
    <div
      className="tree-dropzone drag-active"
      style={{
        minHeight: "10px",
        height: "10px",
        padding: "0",
        border: "none",
        background: "rgba(179, 93, 47, 0.2)",
        margin: "-0.625rem 0",
        borderRadius: "4px",
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onDrop();
      }}
    />
  );
}

function RuleTreeNode({
  rule,
  isRoot,
  selected,
  draggedBox,
  onSelect,
  onChangeRule,
  onRemoveRule,
  onDropItem,
  onDragEnd,
  setDraggedBox,
}: {`;

code = code.replace(ruleTreeNodeStart, newRuleTreeNodeStart);

code = code.replace(
  `  onDropRule: (ruleId: string) => void;
}) {`,
  `  onDropItem: (targetRuleId: string, type: "predicate" | "rule" | "end", index?: number) => void;
  onDragEnd: () => void;
  setDraggedBox: (box: DraggedBox | null) => void;
}) {`
);

const oldDropOnRule = `  const dropOnRule = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onDropRule(rule.id);
  };`;

code = code.replace(oldDropOnRule, "");

const oldRuleTreeNodeHeader = `    <section className={\`tree-rule-card \${isSelected ? "selected" : ""}\`}>`;
const newRuleTreeNodeHeader = `    <section 
      className={\`tree-rule-card \${isSelected ? "selected" : ""}\`}
      draggable={!isRoot}
      onDragStart={(event) => {
        if (isRoot) return;
        event.stopPropagation();
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", \`rule-\${rule.id}\`);
        setDraggedBox({ type: "existing_rule", ruleId: rule.id });
      }}
      onDragEnd={onDragEnd}
    >`;

code = code.replace(oldRuleTreeNodeHeader, newRuleTreeNodeHeader);

const oldTreeChildren = `      <div className="tree-children">
        {rule.predicates.map((predicate) => (
          <PredicateNode
            key={predicate.id}
            predicate={predicate}
            selected={selected}
            onSelect={onSelect}
            onRemove={() => {
              onChangeRule(rule.id, (current) => ({
                ...current,
                predicates: current.predicates.filter((item) => item.id !== predicate.id),
              }));
              onSelect({ type: "rule", ruleId: rule.id });
            }}
          />
        ))}
        {rule.children.map((child) => (
          <RuleTreeNode
            key={child.id}
            rule={child}
            isRoot={false}
            selected={selected}
            draggedBox={draggedBox}
            onSelect={onSelect}
            onChangeRule={onChangeRule}
            onRemoveRule={onRemoveRule}
            onDropRule={onDropRule}
          />
        ))}
        <div
          className={\`tree-dropzone \${draggedBox ? "drag-active" : ""}\`}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect =
              draggedBox?.type === "predicate_template" ||
              draggedBox?.type === "rule_template"
                ? "copy"
                : "move";
          }}
          onDrop={dropOnRule}
        >
          <span>Drop predicate or child group here</span>
        </div>
      </div>`;

const newTreeChildren = `      <div className="tree-children">
        {rule.predicates.length > 0 && <DropZone draggedBox={draggedBox} onDrop={() => onDropItem(rule.id, "predicate", 0)} />}
        {rule.predicates.map((predicate, index) => (
          <div key={predicate.id} style={{ display: 'grid', gap: '1.25rem' }}>
            <PredicateNode
              predicate={predicate}
              selected={selected}
              onSelect={onSelect}
              setDraggedBox={setDraggedBox}
              onDragEnd={onDragEnd}
              onRemove={() => {
                onChangeRule(rule.id, (current) => ({
                  ...current,
                  predicates: current.predicates.filter((item) => item.id !== predicate.id),
                }));
                onSelect({ type: "rule", ruleId: rule.id });
              }}
            />
            <DropZone draggedBox={draggedBox} onDrop={() => onDropItem(rule.id, "predicate", index + 1)} />
          </div>
        ))}
        
        {rule.children.length > 0 && rule.predicates.length === 0 && <DropZone draggedBox={draggedBox} onDrop={() => onDropItem(rule.id, "rule", 0)} />}
        {rule.children.map((child, index) => (
          <div key={child.id} style={{ display: 'grid', gap: '1.25rem' }}>
            <RuleTreeNode
              rule={child}
              isRoot={false}
              selected={selected}
              draggedBox={draggedBox}
              onSelect={onSelect}
              onChangeRule={onChangeRule}
              onRemoveRule={onRemoveRule}
              onDropItem={onDropItem}
              onDragEnd={onDragEnd}
              setDraggedBox={setDraggedBox}
            />
            <DropZone draggedBox={draggedBox} onDrop={() => onDropItem(rule.id, "rule", index + 1)} />
          </div>
        ))}

        {rule.predicates.length === 0 && rule.children.length === 0 && (
          <div
            className={\`tree-dropzone \${draggedBox ? "drag-active" : ""}\`}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            }}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onDropItem(rule.id, "end");
            }}
          >
            <span>Drop predicate or child group here</span>
          </div>
        )}
      </div>`;

code = code.replace(oldTreeChildren, newTreeChildren);

const oldPredicateNodeStart = `function PredicateNode({
  predicate,
  selected,
  onSelect,
  onRemove,
}: {`;

const newPredicateNodeStart = `function PredicateNode({
  predicate,
  selected,
  onSelect,
  onRemove,
  setDraggedBox,
  onDragEnd,
}: {`;

code = code.replace(oldPredicateNodeStart, newPredicateNodeStart);

code = code.replace(
  `  onRemove: () => void;
}) {`,
  `  onRemove: () => void;
  setDraggedBox: (box: DraggedBox | null) => void;
  onDragEnd: () => void;
}) {`
);

const oldPredicateArticle = `    <article
      className={\`tree-predicate-card \${isSelected ? "selected" : ""}\`}
      onClick={() => onSelect({ type: "predicate", predicateId: predicate.id })}`;

const newPredicateArticle = `    <article
      className={\`tree-predicate-card \${isSelected ? "selected" : ""}\`}
      onClick={() => onSelect({ type: "predicate", predicateId: predicate.id })}
      draggable
      onDragStart={(event) => {
        event.stopPropagation();
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", \`predicate-\${predicate.id}\`);
        setDraggedBox({ type: "existing_predicate", predicateId: predicate.id });
      }}
      onDragEnd={onDragEnd}`;

code = code.replace(oldPredicateArticle, newPredicateArticle);

const oldCanvas = `        <div className="rule-canvas">
          <RuleTreeNode
            rule={tree}
            isRoot
            selected={selected}
            draggedBox={draggedBox}
            onSelect={setSelected}
            onChangeRule={changeRule}
            onRemoveRule={(ruleId) => {
              setTree((current) => removeRule(current, ruleId));
              setSelected({ type: "rule", ruleId: tree.id });
            }}
            onDropRule={dropOnRule}
          />
        </div>`;

const newCanvas = `        <div className="rule-canvas">
          <RuleTreeNode
            rule={tree}
            isRoot
            selected={selected}
            draggedBox={draggedBox}
            onSelect={setSelected}
            onChangeRule={changeRule}
            onRemoveRule={(ruleId) => {
              setTree((current) => removeRule(current, ruleId));
              setSelected({ type: "rule", ruleId: tree.id });
            }}
            onDropItem={handleDrop}
            onDragEnd={() => setDraggedBox(null)}
            setDraggedBox={setDraggedBox}
          />
        </div>`;

code = code.replace(oldCanvas, newCanvas);

fs.writeFileSync(file, code);
