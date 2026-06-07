import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";

import { JsonInput } from "../../../components/atoms/JsonInput";
import type { PredicateValue, RulePredicate, RuleTree } from "../../mock-api-responses/types";

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

const operators = [...operatorsWithoutExpected, ...operatorsWithExpected] as const;

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

const operatorNeedsExpected = (operator: string) =>
  (operatorsWithExpected as readonly string[]).includes(operator);

const createId = () => crypto.randomUUID();

// --- DAGRE LAYOUT ---
const nodeWidth = 320;
const nodeHeight = 180; // Avg height

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = "TB") => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: newNodes, edges };
};

// --- CUSTOM NODES ---

type LogicNodeData = {
  type: "and" | "or";
  isRoot?: boolean;
  onChange: (type: "and" | "or") => void;
  onRemove: () => void;
};

function LogicNode({ data }: { data: LogicNodeData }) {
  return (
    <div className="rf-node rf-node-logic">
      {!data.isRoot && <Handle type="target" position={Position.Top} />}
      <div className="rf-node-header">
        <span className="eyebrow">{data.isRoot ? "ROOT" : "GROUP"}</span>
        {!data.isRoot && (
          <button className="rf-node-remove" onClick={data.onRemove} title="Remove Group">
            ×
          </button>
        )}
      </div>
      <div className="rf-node-body">
        <label>
          Match
          <select
            value={data.type}
            onChange={(e) => data.onChange(e.target.value as "and" | "or")}
            className="rf-select"
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

type PredicateNodeData = {
  actual: string;
  operator: string;
  expected: string;
  onChange: (updates: Partial<PredicateNodeData>) => void;
  onRemove: () => void;
};

function PredicateNode({ data }: { data: PredicateNodeData }) {
  return (
    <div className="rf-node rf-node-predicate">
      <Handle type="target" position={Position.Top} />
      <div className="rf-node-header">
        <span className="eyebrow">CONDITION</span>
        <button className="rf-node-remove" onClick={data.onRemove} title="Remove Condition">
          ×
        </button>
      </div>
      <div className="rf-node-body">
        <label>
          Actual Value
          <input
            placeholder="{{request.body.id}}"
            value={data.actual}
            onChange={(e) => data.onChange({ actual: e.target.value })}
            className="rf-input"
          />
        </label>
        <label>
          Operator
          <select
            value={data.operator}
            onChange={(e) => {
              const op = e.target.value;
              data.onChange({
                operator: op,
                expected: operatorNeedsExpected(op) ? data.expected : "",
              });
            }}
            className="rf-select"
          >
            {operators.map((operator) => (
              <option key={operator} value={operator}>
                {operatorAliases[operator] || operator}
              </option>
            ))}
          </select>
        </label>
        {operatorNeedsExpected(data.operator) && (
          <div className="rf-expected-wrapper">
            <JsonInput
              label="Expected Value"
              value={data.expected}
              onChange={(value) => data.onChange({ expected: value || "" })}
            />
          </div>
        )}
      </div>
    </div>
  );
}

const nodeTypes = {
  logic: LogicNode,
  predicate: PredicateNode,
};

// --- DATA MAPPING ---

const parseExpected = (value: string): PredicateValue => {
  if (!value.trim()) return "";
  try {
    return JSON.parse(value) as PredicateValue;
  } catch {
    return value;
  }
};

const stringifyExpected = (value: PredicateValue | undefined): string => {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
};

// Flatten RuleTree -> React Flow Nodes & Edges
function treeToFlow(tree: RuleTree) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  function traverse(node: RuleTree, parentId?: string) {
    const id = createId();

    nodes.push({
      id,
      type: "logic",
      position: { x: 0, y: 0 },
      data: {
        type: node.type,
        isRoot: !parentId,
        // Handlers will be patched in by the component wrapper
      },
    });

    if (parentId) {
      edges.push({
        id: `e-${parentId}-${id}`,
        source: parentId,
        target: id,
      });
    }

    node.predicates.forEach((pred) => {
      const predId = createId();
      nodes.push({
        id: predId,
        type: "predicate",
        position: { x: 0, y: 0 },
        data: {
          actual: pred.actual,
          operator: pred.operator,
          expected: stringifyExpected(pred.expected),
        },
      });
      edges.push({
        id: `e-${id}-${predId}`,
        source: id,
        target: predId,
      });
    });

    node.children?.forEach((child) => traverse(child, id));
  }

  if (tree) traverse(tree);
  return getLayoutedElements(nodes, edges);
}

// Reconstruct RuleTree from React Flow
function flowToTree(nodes: Node[], edges: Edge[]): RuleTree | null {
  const rootNode = nodes.find((n) => n.type === "logic" && n.data.isRoot);
  if (!rootNode) return null;

  function buildSubTree(nodeId: string): RuleTree {
    const node = nodes.find((n) => n.id === nodeId)!;
    const childrenEdges = edges.filter((e) => e.source === nodeId);
    const childIds = childrenEdges.map((e) => e.target);
    const childNodes = nodes.filter((n) => childIds.includes(n.id));

    const predicates: RulePredicate[] = [];
    const children: RuleTree[] = [];

    childNodes.forEach((child) => {
      if (child.type === "predicate") {
        const d = child.data as unknown as PredicateNodeData;
        const pred: RulePredicate = {
          label: d.actual || "Condition",
          type: "simple",
          actual: d.actual,
          operator: d.operator,
        };
        if (operatorNeedsExpected(d.operator)) {
          pred.expected = parseExpected(d.expected);
        }
        predicates.push(pred);
      } else if (child.type === "logic") {
        children.push(buildSubTree(child.id));
      }
    });

    return {
      label: node.data.type === "and" ? "ALL Conditions" : "ANY Condition",
      type: node.data.type as "and" | "or",
      predicates,
      children,
    };
  }

  return buildSubTree(rootNode.id);
}

// --- MAIN COMPONENT ---

export function RuleTreeEditor({
  initialTree,
  onChange,
}: {
  initialTree?: RuleTree | null;
  onChange: (tree: RuleTree) => void;
}) {
  const defaultTree: RuleTree = { type: "and", label: "ALL Conditions", predicates: [], children: [] };
  const initialFlow = useMemo(() => treeToFlow(initialTree || defaultTree), []);

  const [nodes, setNodes] = useNodesState(initialFlow.nodes);
  const [edges, setEdges] = useEdgesState(initialFlow.edges);

  // Notify parent of changes when nodes/edges structurally update or data changes
  useEffect(() => {
    const newTree = flowToTree(nodes, edges);
    if (newTree) onChange(newTree);
  }, [nodes, edges, onChange]);

  const onNodesChangeHandler = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );
  const onEdgesChangeHandler = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      const targetNode = nodes.find(n => n.id === params.target);
      const sourceNode = nodes.find(n => n.id === params.source);
      // Basic rule: only logic can be source
      if (sourceNode?.type !== "logic") return;
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges, nodes]
  );

  const handleLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
  }, [nodes, edges, setNodes, setEdges]);

  // Actions
  const addLogicNode = () => {
    const id = createId();
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "logic",
        position: { x: 50, y: 50 },
        data: { type: "and" },
      },
    ]);
  };

  const addPredicateNode = () => {
    const id = createId();
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "predicate",
        position: { x: 50, y: 50 },
        data: {
          actual: "{{request.headers.content-type}}",
          operator: "equals",
          expected: "application/json",
        },
      },
    ]);
  };

  // Enhance nodes with up-to-date dispatch actions
  const enhancedNodes = useMemo(() => {
    return nodes.map((node) => {
      if (node.type === "logic") {
        return {
          ...node,
          data: {
            ...node.data,
            onChange: (type: "and" | "or") => {
              setNodes((nds) =>
                nds.map((n) => (n.id === node.id ? { ...n, data: { ...n.data, type } } : n))
              );
            },
            onRemove: () => {
              setNodes((nds) => nds.filter((n) => n.id !== node.id));
              setEdges((eds) => eds.filter((e) => e.source !== node.id && e.target !== node.id));
            },
          },
        };
      }
      if (node.type === "predicate") {
        return {
          ...node,
          data: {
            ...node.data,
            onChange: (updates: Partial<PredicateNodeData>) => {
              setNodes((nds) =>
                nds.map((n) =>
                  n.id === node.id ? { ...n, data: { ...n.data, ...updates } } : n
                )
              );
            },
            onRemove: () => {
              setNodes((nds) => nds.filter((n) => n.id !== node.id));
              setEdges((eds) => eds.filter((e) => e.target !== node.id));
            },
          },
        };
      }
      return node;
    });
  }, [nodes, setNodes, setEdges]);

  return (
    <section className="rule-editor">
      <header className="editor-toolbar rule-editor-toolbar">
        <div className="rule-editor-title">
          <p className="eyebrow">Rule tree</p>
          <h2>React Flow Builder</h2>
        </div>
        <div className="rf-toolbar-actions">
          <button type="button" onClick={addPredicateNode} className="rf-btn">
            + Condition
          </button>
          <button type="button" onClick={addLogicNode} className="rf-btn">
            + Logic Group
          </button>
          <button type="button" onClick={handleLayout} className="rf-btn rf-btn-secondary">
            Auto Layout
          </button>
        </div>
      </header>

      <div className="rule-flow-frame">
        <ReactFlow
          nodes={enhancedNodes}
          edges={edges}
          onNodesChange={onNodesChangeHandler}
          onEdgesChange={onEdgesChangeHandler}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.2}
          colorMode="light"
        >
          <Background color="#333" gap={16} />
          <Controls />
        </ReactFlow>
      </div>
    </section>
  );
}
