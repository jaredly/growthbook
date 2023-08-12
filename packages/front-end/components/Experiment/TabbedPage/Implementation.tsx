import {
  ExperimentInterfaceStringDates,
  ExperimentPhaseStringDates,
} from "back-end/types/experiment";
import { VisualChangesetInterface } from "back-end/types/visual-changeset";
import { FaPlusCircle } from "react-icons/fa";
import { MdInfoOutline } from "react-icons/md";
import usePermissions from "@/hooks/usePermissions";
import { VisualChangesetTable } from "@/components/Experiment/VisualChangesetTable";
import ConditionDisplay from "@/components/Features/ConditionDisplay";
import LinkedFeatureFlag from "@/components/Experiment/LinkedFeatureFlag";
import track from "@/services/track";
import { formatTrafficSplit } from "@/services/utils";
import HeaderWithEdit from "../../Layout/HeaderWithEdit";
import { GBAddCircle } from "../../Icons";
import Tooltip from "../../Tooltip/Tooltip";
import ExpandablePhaseSummary from "../ExpandablePhaseSummary";
import { HashVersionTooltip } from "../HashVersionSelector";
import { LinkedFeature } from ".";

export interface Props {
  experiment: ExperimentInterfaceStringDates;
  visualChangesets: VisualChangesetInterface[];
  mutate: () => void;
  newPhase?: (() => void) | null;
  editPhases?: (() => void) | null;
  editPhase?: ((i: number | null) => void) | null;
  editTargeting?: (() => void) | null;
  setFeatureModal: (open: boolean) => void;
  setVisualEditorModal: (open: boolean) => void;
  safeToEdit: boolean;
  linkedFeatures: LinkedFeature[];
  mutateFeatures: () => void;
}

export default function Implementation({
  experiment,
  visualChangesets,
  mutate,
  newPhase,
  editPhases,
  editPhase,
  editTargeting,
  safeToEdit,
  setFeatureModal,
  setVisualEditorModal,
  mutateFeatures,
  linkedFeatures,
}: Props) {
  const phases = experiment.phases || [];
  const lastPhaseIndex = phases.length - 1;
  const lastPhase = phases[lastPhaseIndex] as
    | undefined
    | ExperimentPhaseStringDates;
  const hasNamespace = lastPhase?.namespace && lastPhase.namespace.enabled;
  const namespaceRange = hasNamespace
    ? lastPhase.namespace.range[1] - lastPhase.namespace.range[0]
    : 1;

  const percentFormatter = new Intl.NumberFormat(undefined, {
    style: "percent",
    maximumFractionDigits: 2,
  });

  const permissions = usePermissions();

  const canCreateAnalyses = permissions.check(
    "createAnalyses",
    experiment.project
  );
  const canEditExperiment = !experiment.archived && canCreateAnalyses;

  const hasVisualEditorPermission =
    canEditExperiment &&
    permissions.check("runExperiments", experiment.project, []);

  const numLinkedChanges = visualChangesets.length + linkedFeatures.length;

  return (
    <div>
      <div className="pl-1 mb-3">
        <h2>How was it implemented?</h2>
      </div>

      <div className="row mb-4">
        <div className="col">
          <div className="appbox p-3 h-100 mb-0">
            {numLinkedChanges === 0 && experiment.status !== "draft" ? (
              <div className="alert alert-info mb-0">
                This experiment has no feature flag or visual editor changes
                which are managed within the GrowthBook app. Changes are likely
                implemented manually.
              </div>
            ) : (
              <>
                {(experiment.status === "draft" ||
                  linkedFeatures.length > 0) && (
                  <div className="mb-4">
                    <div className="h4 mb-2">
                      Linked Features{" "}
                      <small className="text-muted">
                        ({linkedFeatures.length})
                      </small>
                    </div>
                    {linkedFeatures.map(({ feature, rules }, i) => (
                      <LinkedFeatureFlag
                        feature={feature}
                        rules={rules}
                        experiment={experiment}
                        key={i}
                        mutateFeatures={mutateFeatures}
                        open={true}
                      />
                    ))}
                    {experiment.status === "draft" &&
                      hasVisualEditorPermission && (
                        <button
                          className="btn btn-link"
                          type="button"
                          onClick={() => {
                            setFeatureModal(true);
                            track("Open linked feature modal", {
                              source: "linked-changes",
                              action: "add",
                            });
                          }}
                        >
                          <FaPlusCircle className="mr-1" />
                          Add Feature Flag
                        </button>
                      )}
                  </div>
                )}
                {(experiment.status === "draft" ||
                  visualChangesets.length > 0) && (
                  <div>
                    <div className="h4 mb-2">
                      Visual Editor Changes{" "}
                      <small className="text-muted">
                        ({visualChangesets.length})
                      </small>
                    </div>
                    <VisualChangesetTable
                      experiment={experiment}
                      visualChangesets={visualChangesets}
                      mutate={mutate}
                      canEditVisualChangesets={hasVisualEditorPermission}
                      setVisualEditorModal={setVisualEditorModal}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <div className="col-auto">
          <div className="d-flex flex-column h-100">
            <div className="appbox p-3 mb-3">
              <HeaderWithEdit
                edit={(safeToEdit ? editTargeting : newPhase) || undefined}
                className="h4"
                containerClassName="mb-3"
              >
                Targeting
              </HeaderWithEdit>
              {lastPhase ? (
                <div className="row">
                  <div className="col">
                    <table className="table table-sm w-auto">
                      <tbody>
                        <tr>
                          <th>
                            Experiment Key{" "}
                            <Tooltip body="This is hashed together with the assignment attribute (below) to deterministically assign users to a variation." />
                          </th>
                          <td>{experiment.trackingKey}</td>
                        </tr>
                        <tr>
                          <th className="pr-5">
                            Assignment Attribute{" "}
                            <Tooltip body="This user attribute will be used to assign variations. This is typically either a logged-in user id or an anonymous id stored in a long-lived cookie.">
                              <MdInfoOutline className="text-info" />
                            </Tooltip>
                          </th>
                          <td>
                            {experiment.hashAttribute || "id"}{" "}
                            {
                              <HashVersionTooltip>
                                <small className="text-muted ml-1">
                                  (V{experiment.hashVersion || 2} hashing)
                                </small>
                              </HashVersionTooltip>
                            }
                          </td>
                        </tr>
                        <tr>
                          <th>Targeting Conditions</th>
                          <td>
                            {lastPhase.condition &&
                            lastPhase.condition !== "{}" ? (
                              <ConditionDisplay
                                condition={lastPhase.condition}
                              />
                            ) : (
                              <em>No conditions</em>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <th>Traffic</th>
                          <td>
                            {Math.floor(lastPhase.coverage * 100)}% included,{" "}
                            {formatTrafficSplit(lastPhase.variationWeights)}{" "}
                            split
                          </td>
                        </tr>
                        <tr>
                          <th>
                            Namespace{" "}
                            <Tooltip body="Use namespaces to run mutually exclusive experiments. Manage namespaces under SDK Configuration -> Namespaces">
                              <MdInfoOutline className="text-info" />
                            </Tooltip>
                          </th>
                          <td>
                            {hasNamespace ? (
                              <>
                                {lastPhase.namespace.name}{" "}
                                <span className="text-muted">
                                  ({percentFormatter.format(namespaceRange)})
                                </span>
                              </>
                            ) : (
                              <em>Global (all users)</em>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <em>No targeting configured yet</em>
              )}
            </div>

            <div className="appbox p-3 mb-0">
              <HeaderWithEdit
                edit={
                  editPhases && !experiment.archived ? editPhases : undefined
                }
                className="h4"
                containerClassName="mb-3"
              >
                Experiment Phases
              </HeaderWithEdit>
              {phases.length > 0 ? (
                <div>
                  {experiment.phases.map((phase, i) => (
                    <ExpandablePhaseSummary
                      key={i}
                      phase={phase}
                      i={i}
                      editPhase={editPhase ?? undefined}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center p-3">
                  <em>No experiment phases defined.</em>
                  {newPhase && (
                    <div className="mt-2">
                      <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={newPhase}
                      >
                        <GBAddCircle /> Add a Phase
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}