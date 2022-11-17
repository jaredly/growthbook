import { SavedGroupInterface } from "back-end/types/saved-group";
import { useDefinitions } from "../../services/DefinitionsContext";
import { jsonToConds, useAttributeMap } from "../../services/features";
import InlineCode from "../SyntaxHighlighting/InlineCode";
import stringify from "json-stringify-pretty-compact";
import { useMemo } from "react";

function operatorToText(operator: string, datatype: string): string {
  if (datatype === "date") {
    switch (operator) {
      case "$lt":
        return `is before`;
      case "$gt":
        return `is after`;
    }
  }

  switch (operator) {
    case "$eq":
      return `is equal to`;
    case "$ne":
      return `is not equal to`;
    case "$includes":
      return `includes`;
    case "$notIncludes":
      return `does not include`;
    case "$empty":
      return `is empty`;
    case "$notEmpty":
      return `is not empty`;
    case "$lt":
      return `is less than`;
    case "$lte":
      return `is less than or equal to`;
    case "$gt":
      return `is greater than`;
    case "$gte":
      return `is greater than or equal to`;
    case "$exists":
      return `exists`;
    case "$notExists":
      return `does not exist`;
    case "$in":
      return `is in the list`;
    case "$nin":
      return `is not in the list`;
    case "$inGroup":
      return `is in the saved group`;
    case "$notInGroup":
      return `is not in the saved group`;
    case "$true":
      return "is";
    case "$false":
      return "is";
    case "$regex":
      return `matches the pattern`;
    case "$notRegex":
      return `does not match the pattern`;
  }
  return operator;
}

function needsValue(operator: string) {
  return !["$exists", "$notExists", "$empty", "$notEmpty"].includes(operator);
}
function getValue(
  operator: string,
  value: string,
  datatype: string,
  savedGroups?: SavedGroupInterface[]
): string {
  if (operator === "$true") return "TRUE";
  if (operator === "$false") return "FALSE";

  if (datatype === "date") {
    return `${new Date(parseInt(value)).toLocaleDateString()} at ${new Date(
      parseInt(value)
    ).toLocaleTimeString([], { timeStyle: "short" })} ${new Date(
      parseInt(value)
    )
      .toLocaleDateString(undefined, { day: "2-digit", timeZoneName: "short" })
      .substring(4)}`;
  }

  // Get the groupName from the associated group.id to display a human readable name.
  if (operator === ("$inGroup" || "$notInGroup") && savedGroups) {
    const index = savedGroups.find((i) => i.id === value);

    return index?.groupName || "Group was Deleted";
  }
  return value;
}

export default function ConditionDisplay({ condition }: { condition: string }) {
  const { savedGroups } = useDefinitions();

  const jsonFormatted = useMemo(() => {
    try {
      const parsed = JSON.parse(condition);
      return stringify(parsed);
    } catch (e) {
      console.error(e);
      return condition;
    }
  }, [condition]);

  const conds = jsonToConds(condition);

  const attributes = useAttributeMap();

  // Could not parse into simple conditions
  if (conds === null || !attributes.size) {
    return <InlineCode language="json" code={jsonFormatted} />;
  }

  return (
    <div className="row">
      {conds.map(({ field, operator, value }, i) => {
        const { datatype } = attributes.get(field);
        return (
          <div key={i} className="col-auto d-flex flex-wrap">
            {i > 0 && <span className="mr-1">AND</span>}
            <span className="mr-1 border px-2 bg-light rounded">{field}</span>
            <span className="mr-1">{operatorToText(operator, datatype)}</span>
            {needsValue(operator) ? (
              <span className="mr-1 border px-2 bg-light rounded">
                {getValue(operator, value, datatype, savedGroups)}
              </span>
            ) : (
              ""
            )}
          </div>
        );
      })}
    </div>
  );
}
