import { ExperimentInterface } from "back-end/types/experiment";
import { FeatureInterface, ExperimentRefRule } from "back-end/types/feature";

import { subWeeks } from "date-fns";
import { isFeatureStale } from "../../src/util";

const genMockExperiment = ({
  id,
  status,
  ...rest
}: Partial<ExperimentInterface>): ExperimentInterface => ({
  id: id || "exp_123",
  status: status || "running",
  trackingKey: "",
  organization: "123",
  owner: "adnan",
  datasource: "",
  exposureQueryId: "",
  implementation: "code",
  hashAttribute: "id",
  hashVersion: 2,
  name: "test",
  dateCreated: new Date(),
  dateUpdated: new Date(),
  tags: [],
  metrics: [],
  autoAssign: false,
  previewURL: "",
  targetURLRegex: "",
  phases: [],
  releasedVariationId: "",
  autoSnapshots: false,
  variations: [],
  archived: false,
  ...rest,
});

const genExperimentRef = ({
  experimentId,
  variations,
  enabled,
}: Partial<ExperimentRefRule>): ExperimentRefRule => ({
  type: "experiment-ref",
  id: "fr_1xx71iycloeon68r",
  experimentId: experimentId || "exp_1xx71iycloeomlw6",
  description: "",
  variations: variations || [
    {
      variationId: "var_loeomlv8",
      value: "false",
    },
    {
      variationId: "var_loeomlv9",
      value: "true",
    },
  ],
  enabled: enabled != null ? enabled : true,
});

describe("isFeatureStale", () => {
  let feature: FeatureInterface;

  beforeEach(() => {
    feature = {
      dateCreated: new Date("2020-04-20"),
      dateUpdated: new Date("2020-04-20"),
      defaultValue: "true",
      environmentSettings: {},
      id: "feature-123",
      organization: "123",
      owner: "adnan",
      valueType: "boolean",
    };
  });
  describe("if the feature is in a draft state", () => {
    beforeEach(() => {
      feature.draft = {
        active: true,
        ...feature,
      };
    });
    describe("and has been updated within past two weeks", () => {
      it("is not stale", () => {
        feature.dateUpdated = subWeeks(new Date(), 1);
        expect(isFeatureStale(feature)).toEqual({ stale: false });
      });
    });
    describe("and has not been updated within past two weeks", () => {
      it("is stale", () => {
        feature.dateUpdated = subWeeks(new Date(), 3);
        expect(isFeatureStale(feature)).toEqual({
          stale: true,
          reason: "draft-state",
        });
      });
    });
  });

  describe("when all environments are disabled", () => {
    beforeEach(() => {
      feature.environmentSettings = {
        development: { enabled: false, rules: [] },
        staging: {
          enabled: false,
          rules: [
            {
              description: "test",
              type: "force",
              id: "123",
              value: "123",
            },
          ],
        },

        production: { enabled: false, rules: [] },
      };
    });
    describe("and has been updated within past two weeks", () => {
      it("is not stale", () => {
        feature.dateUpdated = subWeeks(new Date(), 1);
        expect(isFeatureStale(feature)).toEqual({ stale: false });
      });
    });
    describe("and has not been updated within past two weeks", () => {
      it("is stale", () => {
        feature.dateUpdated = subWeeks(new Date(), 3);
        expect(isFeatureStale(feature)).toEqual({
          stale: true,
          reason: "no-active-envs",
        });
      });
    });
  });

  describe("when feature has no rules", () => {
    beforeEach(() => {
      feature.environmentSettings = {
        development: { enabled: true, rules: [] },
        staging: { enabled: true, rules: [] },
        production: { enabled: false, rules: [] },
      };
    });
    describe("and has been updated within past two weeks", () => {
      it("is not stale", () => {
        feature.dateUpdated = subWeeks(new Date(), 1);
        expect(isFeatureStale(feature)).toEqual({ stale: false });
      });
    });
    describe("and has not been updated within past two weeks", () => {
      it("is stale", () => {
        feature.dateUpdated = subWeeks(new Date(), 3);
        expect(isFeatureStale(feature)).toEqual({
          stale: true,
          reason: "no-rules",
        });
      });
    });
  });

  describe("when feature has linked experiments", () => {
    beforeEach(() => {
      feature.linkedExperiments = ["exp_1", "exp_2", "exp_3"];
    });

    describe("but no experiments are supplied to isFeatureStale util fn", () => {
      it("should fail silently and return false", () => {
        expect(isFeatureStale(feature)).toEqual({
          stale: false,
          reason: "error",
        });
      });
    });

    describe("if all linked experiments are inactive (either draft or stopped)", () => {
      let experiments: ExperimentInterface[];
      beforeEach(() => {
        experiments = [
          genMockExperiment({ id: "exp_1", status: "draft" }),
          genMockExperiment({ id: "exp_2", status: "stopped" }),
          genMockExperiment({ id: "exp_3", status: "draft" }),
        ];
        feature.linkedExperiments = experiments.map((e) => e.id);
        feature.environmentSettings = {
          dev: {
            enabled: true,
            rules: experiments.map((e) =>
              genExperimentRef({
                experimentId: e.id,
              })
            ),
          },
          prod: {
            enabled: true,
            rules: experiments.map((e) =>
              genExperimentRef({
                experimentId: e.id,
              })
            ),
          },
        };
      });
      describe("and has been updated within past two weeks", () => {
        it("is not stale", () => {
          feature.dateUpdated = subWeeks(new Date(), 1);
          expect(isFeatureStale(feature, experiments)).toEqual({
            stale: false,
          });
        });
      });
      describe("and has not been updated within past two weeks", () => {
        it("is stale", () => {
          feature.dateUpdated = subWeeks(new Date(), 3);
          expect(isFeatureStale(feature, experiments)).toEqual({
            stale: true,
            reason: "no-active-exps",
          });
        });
      });
    });

    describe("if all linked experiments are routing 100% to a single variation", () => {
      let experiments: ExperimentInterface[];
      beforeEach(() => {
        experiments = [
          genMockExperiment({
            id: "exp_1",
            status: "running",
            variations: [
              {
                id: "var-01",
                name: "var-01",
                key: "var-01",
                screenshots: [],
              },
              {
                id: "var-02",
                name: "var-02",
                key: "var-02",
                screenshots: [],
              },
              {
                id: "var-03",
                name: "var-03",
                key: "var-03",
                screenshots: [],
              },
            ],
            phases: [
              {
                dateStarted: new Date(),
                name: "",
                reason: "",
                coverage: 1,
                condition: "",
                namespace: {
                  enabled: false,
                  name: "",
                  range: [0, 1],
                },
                variationWeights: [0, 0, 1],
              },
            ],
          }),
          genMockExperiment({
            id: "exp_2",
            status: "running",
            variations: [
              {
                id: "var-01",
                name: "var-01",
                key: "var-01",
                screenshots: [],
              },
              {
                id: "var-02",
                name: "var-02",
                key: "var-02",
                screenshots: [],
              },
              {
                id: "var-03",
                name: "var-03",
                key: "var-03",
                screenshots: [],
              },
            ],
            phases: [
              {
                dateStarted: new Date(),
                name: "",
                reason: "",
                coverage: 1,
                condition: "",
                namespace: {
                  enabled: false,
                  name: "",
                  range: [0, 1],
                },
                variationWeights: [0, 1],
              },
            ],
          }),
        ];

        feature.linkedExperiments = experiments.map((e) => e.id);

        feature.environmentSettings = {
          dev: {
            enabled: true,
            rules: experiments.map((e) =>
              genExperimentRef({
                experimentId: e.id,
              })
            ),
          },
          prod: {
            enabled: true,
            rules: experiments.map((e) =>
              genExperimentRef({
                experimentId: e.id,
              })
            ),
          },
        };
      });
      describe("and has been updated within past two weeks", () => {
        it("is not stale", () => {
          feature.dateUpdated = subWeeks(new Date(), 1);
          expect(isFeatureStale(feature, experiments)).toEqual({
            stale: false,
          });
        });
      });
      describe("and has not been updated within past two weeks", () => {
        it("is stale", () => {
          feature.dateUpdated = subWeeks(new Date(), 3);
          expect(isFeatureStale(feature, experiments)).toEqual({
            stale: true,
            reason: "all-exps-onesided",
          });
        });
      });
    });

    describe("if all linked experiments are NOT routing 100% to a single variation", () => {
      let experiments: ExperimentInterface[];
      beforeEach(() => {
        experiments = [
          genMockExperiment({
            id: "exp_1",
            status: "running",
            variations: [
              {
                id: "var-01",
                name: "var-01",
                key: "var-01",
                screenshots: [],
              },
              {
                id: "var-02",
                name: "var-02",
                key: "var-02",
                screenshots: [],
              },
              {
                id: "var-03",
                name: "var-03",
                key: "var-03",
                screenshots: [],
              },
            ],
            phases: [
              {
                dateStarted: new Date(),
                name: "",
                reason: "",
                coverage: 1,
                condition: "",
                namespace: {
                  enabled: false,
                  name: "",
                  range: [0, 1],
                },
                variationWeights: [0, 0, 1],
              },
            ],
          }),
          genMockExperiment({
            id: "exp_2",
            status: "running",
            variations: [
              {
                id: "var-01",
                name: "var-01",
                key: "var-01",
                screenshots: [],
              },
              {
                id: "var-02",
                name: "var-02",
                key: "var-02",
                screenshots: [],
              },
              {
                id: "var-03",
                name: "var-03",
                key: "var-03",
                screenshots: [],
              },
            ],
            phases: [
              {
                dateStarted: new Date(),
                name: "",
                reason: "",
                coverage: 1,
                condition: "",
                namespace: {
                  enabled: false,
                  name: "",
                  range: [0, 1],
                },
                variationWeights: [0.3, 7],
              },
            ],
          }),
        ];

        feature.linkedExperiments = experiments.map((e) => e.id);

        feature.environmentSettings = {
          dev: {
            enabled: true,
            rules: experiments.map((e) =>
              genExperimentRef({
                experimentId: e.id,
              })
            ),
          },
          prod: {
            enabled: true,
            rules: experiments.map((e) =>
              genExperimentRef({
                experimentId: e.id,
              })
            ),
          },
        };
      });
      describe("and has been updated within past two weeks", () => {
        it("is not stale", () => {
          feature.dateUpdated = subWeeks(new Date(), 1);
          expect(isFeatureStale(feature, experiments)).toEqual({
            stale: false,
          });
        });
      });
      describe("and has not been updated within past two weeks", () => {
        it("is not stale", () => {
          feature.dateUpdated = subWeeks(new Date(), 3);
          expect(isFeatureStale(feature, experiments)).toEqual({
            stale: false,
          });
        });
      });
    });
  });

  // TODO
  // describe("when includeExperimentInPayload returns true", () => {
  //   it("should never be stale", () => {});
  // });
});
