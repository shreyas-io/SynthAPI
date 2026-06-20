import { useEffect } from "react";
import {
  Background,
  ReactFlow,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  type Edge,
  type Node,
} from "@xyflow/react";
import dagre from "dagre";
import "@xyflow/react/dist/style.css";

import "./rule_tree_preview.css";

export type RuleTreePreviewValue =
  | string
  | number
  | boolean
  | null
  | Record<string, unknown>
  | unknown[];

export type RuleTreePreviewPredicate = {
  label?: string;
  actual: string;
  operator: string;
  expected?: RuleTreePreviewValue;
};

export type RuleTreePreviewTree = {
  label: string;
  type: "and" | "or";
  predicates: RuleTreePreviewPredicate[];
  children: RuleTreePreviewTree[];
};

export type RuleTreePreviewProps = {
  tree: RuleTreePreviewTree;
  className?: string;
  selectedNodePath?: string;
};

type LogicNodeData = {
  type: "and" | "or";
  isRoot?: boolean;
  isSelected?: boolean;
};

type PredicateNodeData = {
  actual: string;
  operator: string;
  expected: string;
  isSelected?: boolean;
};

const operatorsWithoutExpected = [
  "null",
  "not_null",
  "empty_array",
  "not_empty_array",
  "is_set",
  "is_not_set",
  "string_empty",
  "string_not_empty",
  "valid_json_schema",
] as const;

const operatorsWithExpected = [
  "equals",
  "not_equals",
  "regex",
  "gt",
  "gte",
  "lt",
  "lte",
  "array_includes",
  "string_includes",
  "string_not_includes",
] as const;

const operators = [
  ...operatorsWithoutExpected,
  ...operatorsWithExpected,
] as const;

const operatorAliases: Record<string, string> = {
  null: "Is Null",
  not_null: "Is Not Null",
  empty_array: "Is Empty Array",
  not_empty_array: "Is Not Empty Array",
  is_set: "Is Set (Exists)",
  is_not_set: "Is Not Set (Missing)",
  string_empty: "Is Empty String",
  string_not_empty: "Is Not Empty String",
  equals: "Equals",
  not_equals: "Does Not Equal",
  regex: "Matches Regex",
  gt: "Greater Than (>)",
  gte: "Greater Than or Equal (>=)",
  lt: "Less Than (<)",
  lte: "Less Than or Equal (<=)",
  array_includes: "Array Includes",
  string_includes: "String Contains",
  string_not_includes: "String Does Not Contain",
  valid_json_schema: "Valid JSON",
};

const nodeTypes = {
  logic: LogicNode,
  predicate: PredicateNode,
};

const nodeWidth = 320;
const nodeHeight = 180;

function LogicNode({ data }: { data: LogicNodeData }) {
  return (
    <div
      className={`sui-rf-node sui-rf-node-logic${data.isSelected ? " is-selected" : ""}`}
    >
      {!data.isRoot && <Handle type="target" position={Position.Top} />}
      <div className="sui-rf-node-header">
        <span className="sui-eyebrow">{data.isRoot ? "ROOT" : "GROUP"}</span>
      </div>
      <div className="sui-rf-node-body">
        <label>
          Match
          <select
            value={data.type}
            className="sui-rf-select"
            disabled
            aria-label="Match mode"
          >
            <option value="and">ALL (AND)</option>
            <option value="or">ANY (OR)</option>
          </select>
        </label>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

function PredicateNode({ data }: { data: PredicateNodeData }) {
  return (
    <div
      className={`sui-rf-node sui-rf-node-predicate${data.isSelected ? " is-selected" : ""}`}
    >
      <Handle type="target" position={Position.Top} />
      <div className="sui-rf-node-header">
        <span className="sui-eyebrow">CONDITION</span>
      </div>
      <div className="sui-rf-node-body">
        <label>
          Actual Value
          <input
            value={data.actual}
            className="sui-rf-input"
            disabled
            aria-label="Actual value"
          />
        </label>
        <label>
          Operator
          <select
            value={data.operator}
            className="sui-rf-select"
            disabled
            aria-label="Operator"
          >
            {operators.map((operator) => (
              <option key={operator} value={operator}>
                {operatorAliases[operator] || operator}
              </option>
            ))}
          </select>
        </label>
        {operatorNeedsExpected(data.operator) && (
          <label>
            Expected Value
            <textarea
              value={data.expected}
              className="sui-rf-textarea"
              disabled
              aria-label="Expected value"
            />
          </label>
        )}
      </div>
    </div>
  );
}

const operatorNeedsExpected = (operator: string) =>
  (operatorsWithExpected as readonly string[]).includes(operator);

const stringifyExpected = (value: RuleTreePreviewValue | undefined): string => {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
};

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: "TB",
    ranksep: 78,
    nodesep: 28,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return {
    nodes: nodes.map((node) => {
      const position = dagreGraph.node(node.id);
      return {
        ...node,
        position: {
          x: position.x - nodeWidth / 2,
          y: position.y - nodeHeight / 2,
        },
      };
    }),
    edges,
  };
};

const treeToFlow = (
  tree: RuleTreePreviewTree,
  selectedNodePath?: string,
): { nodes: Node[]; edges: Edge[] } => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const visit = (
    current: RuleTreePreviewTree,
    currentPath: string,
    parentId?: string,
  ) => {
    nodes.push({
      id: currentPath,
      type: "logic",
      position: { x: 0, y: 0 },
      data: {
        type: current.type,
        isRoot: !parentId,
        isSelected: selectedNodePath === currentPath,
      } satisfies LogicNodeData,
    });

    if (parentId) {
      edges.push({
        id: `edge-${parentId}-${currentPath}`,
        source: parentId,
        target: currentPath,
      });
    }

    current.predicates.forEach((predicate, index) => {
      const predicatePath = `${currentPath}.predicates.${index}`;

      nodes.push({
        id: predicatePath,
        type: "predicate",
        position: { x: 0, y: 0 },
        data: {
          actual: predicate.actual,
          operator: predicate.operator,
          expected: stringifyExpected(predicate.expected),
          isSelected: selectedNodePath === predicatePath,
        } satisfies PredicateNodeData,
      });

      edges.push({
        id: `edge-${currentPath}-${predicatePath}`,
        source: currentPath,
        target: predicatePath,
      });
    });

    current.children.forEach((child, index) => {
      visit(child, `${currentPath}.children.${index}`, currentPath);
    });
  };

  visit(tree, "root");
  return getLayoutedElements(nodes, edges);
};

export function RuleTreePreview({
  tree,
  className,
  selectedNodePath,
}: RuleTreePreviewProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    const flow = treeToFlow(tree, selectedNodePath);
    setNodes(flow.nodes);
    setEdges(flow.edges);
  }, [tree, selectedNodePath, setNodes, setEdges]);

  return (
    <div
      className={`sui-rule-tree-preview${className ? ` ${className}` : ""}`}
    >
      <div className="sui-rule-flow-frame">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          minZoom={0.35}
          nodesConnectable={false}
          deleteKeyCode={null}
          proOptions={{ hideAttribution: true }}
          colorMode="dark"
        >
          <Background color="#272822" gap={16} />
        </ReactFlow>
      </div>
    </div>
  );
}
