# Harness CI/CD Training Guide

## NodeJSCICD-1 --- Build, Approve, Deploy, and Roll Back

> **Purpose:** A practical reference for DevOps engineers to understand
> the Harness platform and operate the `NodeJSCICD-1` pipeline that
> builds a Node.js container image, publishes it to Docker Hub, pauses
> for manual approval, and deploys it to Kubernetes.

------------------------------------------------------------------------

## 1. Harness fundamentals

### 1.1 What is Harness?

**Harness** is a software delivery platform that helps teams automate
and manage the software delivery lifecycle. It provides capabilities for
continuous integration (CI), continuous delivery (CD), deployment
verification, security, feature management, and related DevOps
workflows.

For this training pipeline, Harness is used to:

-   Connect to a source-code repository in GitHub.
-   Build a container image from the Node.js application.
-   Push the image to Docker Hub.
-   Pause the pipeline for a human approval.
-   Deploy the application to a Kubernetes cluster.
-   Run rollback steps when the deployment stage fails.

### 1.2 Basic CI/CD concepts

  -----------------------------------------------------------------------
  Concept                             Meaning
  ----------------------------------- -----------------------------------
  Continuous Integration (CI)         Automatically checks out source
                                      code and builds or tests it
                                      whenever a pipeline is triggered.

  Continuous Delivery / Deployment    Automates delivery of a built
  (CD)                                application to a target
                                      environment.

  Pipeline                            The complete workflow that defines
                                      the stages and steps to deliver an
                                      application.

  Stage                               A major section of a pipeline, such
                                      as Build, Approval, or Deploy.

  Step                                An individual action inside a
                                      stage, such as building an image or
                                      requesting approval.

  Connector                           A configured integration that lets
                                      Harness authenticate to an external
                                      system, such as GitHub, Docker Hub,
                                      or Kubernetes.

  Delegate                            A service that runs in your
                                      infrastructure and allows Harness
                                      to communicate with systems that
                                      are not directly reachable from
                                      Harness-managed infrastructure.

  Service                             A Harness configuration describing
                                      the application being deployed,
                                      including its artifacts and
                                      manifests.

  Environment                         The target deployment environment,
                                      such as Development, QA, or
                                      Production.

  Infrastructure definition           The specific cluster or
                                      infrastructure target associated
                                      with an environment.

  Secret                              Sensitive information, such as
                                      passwords, tokens, and keys, stored
                                      and referenced securely rather than
                                      hardcoded in pipeline YAML.

  Approval                            A manual checkpoint that requires
                                      an authorized person or group to
                                      approve or reject the next part of
                                      a pipeline.

  Rollback                            An attempt to restore the previous
                                      working deployment when a
                                      deployment fails.
  -----------------------------------------------------------------------

### 1.3 How the main Harness components work together

1.  **GitHub connector** --- authenticates Harness to the source
    repository.
2.  **Pipeline** --- defines the sequence of CI and CD activities.
3.  **Build infrastructure** --- runs the image build. This example uses
    Harness cloud runtime for the build stage.
4.  **Docker Hub connector** --- authenticates the image push.
5.  **Approval step** --- pauses execution until an authorized approver
    responds.
6.  **Kubernetes connector** --- provides access to the target cluster.
7.  **Delegate (when required)** --- provides a network path from
    Harness to a private or local cluster.
8.  **Service and Environment** --- identify what is being deployed and
    where it is deployed.

**Important:** A Harness Delegate is not the Kubernetes control plane or
a Kubernetes controller. It is a Harness agent/service that executes
delegated tasks and facilitates communication between Harness and
infrastructure or systems it needs to reach. Kubernetes controllers are
separate Kubernetes components that continuously reconcile the cluster's
actual state with its desired state.

### 1.4 Pipeline flow

``` text
GitHub repository (main)
          |
          v
   Clone source code
          |
          v
 Build Node.js container image
          |
          v
 Push image to Docker Hub
          |
          v
   Manual approval gate
       /          \
   Rejected       Approved
      |               |
      v               v
 Deployment skipped  Deploy to Kubernetes
                          |
                    Deployment result
                      /       \
                   Success    Failure
                     |           |
                     v           v
                  Complete   Run rollback
```

### 1.5 What happens in this training pipeline?

  ------------------------------------------------------------------------
                         Order Stage                 Responsibility
  ---------------------------- --------------------- ---------------------
                             1 Build and Push        Clone the repository,
                                                     build the Node.js
                                                     container image, and
                                                     push it to Docker
                                                     Hub.

                             2 Approve Deployment    Wait for an
                                                     authorized member of
                                                     `approvers_group` to
                                                     approve the
                                                     deployment.

                             3 Deploy to Local K8s   Deploy the configured
                                                     service to the
                                                     `nodeapp` namespace
                                                     using a rolling
                                                     deployment.

                             4 Rollback on failure   Execute the
                                                     configured rolling
                                                     rollback when the
                                                     deployment stage
                                                     fails and the failure
                                                     strategy triggers it.
  ------------------------------------------------------------------------

------------------------------------------------------------------------

## 2. Pipeline overview

  Property                    Value
  --------------------------- ----------------------------
  Pipeline ID                 `NodeJSCICD_1`
  Pipeline name               `NodeJSCICD-1`
  Source repository           `gsd00110110/harness-demo`
  Source branch               `main`
  Image repository            `gsd00110110/harness`
  Demo image tag              `v7`
  Harness Service             `nodeapp`
  Harness Environment         `local_k8s`
  Infrastructure definition   `local_k8s_infra`
  Kubernetes namespace        `nodeapp`
  Approval group              `approvers_group`

### End-to-end workflow

**Clone the code → Build the image → Push to Docker Hub → Manual
approval → Deploy to Kubernetes → Roll back if deployment fails.**

------------------------------------------------------------------------

## 3. Pipeline configuration explained

### 3.1 Pipeline identity

``` yaml
pipeline:
  id: NodeJSCICD_1
  name: NodeJSCICD-1
  description: Build the Node.js app image, push it to Docker Hub, require manual approval, and deploy it to the local Kubernetes cluster.
```

  -----------------------------------------------------------------------
  YAML field                          Explanation
  ----------------------------------- -----------------------------------
  `pipeline`                          Root element of this Harness
                                      pipeline definition.

  `id`                                Unique pipeline identifier. Use
                                      letters, numbers, and underscores
                                      as required by this pipeline
                                      format. The ID cannot be changed
                                      after creation.

  `name`                              Display name shown in the Harness
                                      UI.

  `description`                       Short explanation of the pipeline's
                                      purpose.
  -----------------------------------------------------------------------

### 3.2 Source-code checkout

``` yaml
clone:
  enabled: true
  connector: httpsgithubcomgsd00110110harness_demo
  repo: gsd00110110/harness-demo
  ref:
    type: branch
    name: main
```

  -----------------------------------------------------------------------
  YAML field                          Explanation
  ----------------------------------- -----------------------------------
  `clone`                             Configures pipeline-level
                                      source-code checkout.

  `enabled: true`                     Enables automatic repository
                                      cloning.

  `connector`                         Harness GitHub connector used to
                                      authenticate to GitHub.

  `repo`                              Repository in `owner/repository`
                                      format.

  `ref.type: branch`                  Indicates that the selected Git
                                      reference is a branch.

  `ref.name: main`                    Branch to be checked out for the
                                      build.
  -----------------------------------------------------------------------

**Operational check:** Confirm that the connector exists, its test
connection succeeds, and the configured account has permission to read
the repository.

### 3.3 Stage 1 --- Build and push the image (CI)

``` yaml
- id: build
  name: Build and Push
  runtime: cloud
  platform:
    os: linux
    arch: amd64
  steps:
    - id: build_and_push
      name: Build and Push Image
      build:
        uses: buildAndPushToDocker
        with:
          connector: httpshubdockercomrepositorydockergsd00110110harnessgeneral
          repo: gsd00110110/harness
          tags:
            - v7
```

**What this stage does**

1.  Uses the checked-out source code.
2.  Executes the reusable `buildAndPushToDocker` template.
3.  Builds a container image using the application's Docker build
    configuration.
4.  Authenticates to Docker Hub using the configured connector.
5.  Pushes the image to `gsd00110110/harness` with the `v7` tag.

  -----------------------------------------------------------------------
  YAML field                          Explanation
  ----------------------------------- -----------------------------------
  `stages`                            Ordered list of pipeline stages.

  `id: build`                         Unique identifier for this stage.

  `name`                              Display name in the Harness UI.

  `runtime: cloud`                    Runs the build stage on Harness
                                      cloud infrastructure.

  `platform.os`                       Operating system for the build
                                      runtime.

  `platform.arch`                     CPU architecture for the build
                                      runtime.

  `steps`                             Actions performed inside the stage.

  `build.uses`                        Calls the reusable image-build
                                      template.

  `with.connector`                    Docker Hub connector used for
                                      authentication.

  `with.repo`                         Destination Docker Hub repository.

  `with.tags`                         Image tags to publish.
  -----------------------------------------------------------------------

The resulting demo image is:

``` text
gsd00110110/harness:v7
```

**Training note --- image tags:** `v7` is hardcoded. Repeated pipeline
runs can overwrite the same tag. For a production workflow, use an
immutable or unique tag for each build, such as a pipeline run number or
commit SHA, and ensure the deployment consumes the exact image produced
by that run. Avoid relying only on a mutable tag such as `latest`.

### 3.4 Stage 2 --- Manual approval gate

``` yaml
- id: approve_deploy
  name: Approve Deployment
  steps:
    - id: manual_approval
      name: Manual Approval
      timeout: 1d
      approval:
        uses: harness
        with:
          message: Please review and approve the deployment to local Kubernetes.
          user-groups:
            - approvers_group
          approvers-min-count: 1
          block-executor: false
```

**What this stage does**

After the image push succeeds, the pipeline pauses and requests approval
before deploying to Kubernetes.

  -----------------------------------------------------------------------
  YAML field                          Explanation
  ----------------------------------- -----------------------------------
  `id: approve_deploy`                Unique stage identifier.

  `timeout: 1d`                       Approval step waits for up to one
                                      day. If no valid approval is
                                      received before the timeout, the
                                      step fails.

  `approval.uses: harness`            Uses Harness's built-in approval
                                      mechanism.

  `message`                           Instructions displayed to the
                                      approver.

  `user-groups`                       Harness user groups allowed to
                                      approve.

  `approvers-min-count: 1`            At least one approval is required.

  `block-executor: false`             Does not prevent the person who
                                      started the execution from
                                      approving it. Set to `true` when
                                      separation of duties is required.
  -----------------------------------------------------------------------

**Approval behavior**

-   If an authorized user approves, the pipeline continues to the
    deployment stage.
-   If the request is rejected, the approval step fails and the
    deployment stage does not proceed.
-   If the approval times out, the approval step fails and the
    deployment stage does not proceed.

**Prerequisite:** `approvers_group` must exist at the appropriate
Harness scope and contain at least one eligible user with permission to
approve the execution in the project.

### 3.5 Stage 3 --- Deploy to Kubernetes (CD)

``` yaml
- id: deploy
  name: Deploy to Local K8s
  service:
    items:
      - id: nodeapp
  environment:
    items:
      - id: local_k8s
        deploy-to: local_k8s_infra
  runtime:
    kubernetes:
      connector: connector_K8sCluster_a5eb
      namespace: nodeapp
  steps:
    - id: k8sRollingDeployStep
      name: Kubernetes Rolling Deploy
      template:
        uses: k8sRollingDeployStep
```

**What this stage does**

Deploys the Harness Service `nodeapp` to the `local_k8s` environment and
its `local_k8s_infra` infrastructure definition. The Kubernetes
connector provides access to the cluster, and the deployment targets the
`nodeapp` namespace.

  -----------------------------------------------------------------------
  YAML field                          Explanation
  ----------------------------------- -----------------------------------
  `service`                           Identifies the application to
                                      deploy.

  `service.items[].id`                Harness Service identifier. Here it
                                      is `nodeapp`.

  `environment`                       Identifies the target environment.

  `environment.items[].id`            Harness Environment identifier.

  `deploy-to`                         Infrastructure definition selected
                                      within the environment.

  `runtime.kubernetes`                Configures Kubernetes deployment
                                      execution.

  `connector`                         Harness Kubernetes connector used
                                      to access the cluster.

  `namespace`                         Kubernetes namespace targeted by
                                      the deployment.

  `template.uses`                     Calls the reusable
                                      rolling-deployment template.
  -----------------------------------------------------------------------

**What is a rolling deployment?**

A rolling deployment gradually replaces existing application pods with
new pods. Kubernetes can keep the application available during the
update, provided the workload's readiness probes, replica count,
resource capacity, and deployment strategy are configured appropriately.

**Validate the deployment**

``` bash
kubectl get deployments -n nodeapp
kubectl get pods -n nodeapp
kubectl get services -n nodeapp
kubectl rollout status deployment/<deployment-name> -n nodeapp
```

Replace `<deployment-name>` with the actual Kubernetes Deployment name
created by the service manifests.

### 3.6 Rollback and failure handling

The pipeline defines a rolling rollback template and a stage-level
failure strategy. The intended behavior is to run the rollback when the
deployment stage encounters a failure covered by the strategy.

Conceptually, the configuration is:

``` yaml
rollback:
  - group:
      id: k8sRollingRollback
      name: Kubernetes Rolling Rollback
      steps:
        - id: k8sRollingRollbackStep
          name: Kubernetes Rolling Rollback
          template:
            uses: k8sRollingRollbackStep

on-failure:
  errors: all
  action: stage-rollback
```

  -----------------------------------------------------------------------
  YAML field                          Explanation
  ----------------------------------- -----------------------------------
  `rollback`                          Defines steps to execute when the
                                      configured rollback action is
                                      triggered.

  `group`                             Groups related rollback steps.

  `k8sRollingRollbackStep`            Reusable rollback template that
                                      performs the Kubernetes rolling
                                      rollback.

  `on-failure`                        Defines the stage's failure
                                      strategy.

  `errors: all`                       Applies the strategy to all errors
                                      covered by this configuration.

  `action: stage-rollback`            Requests the stage rollback action
                                      when the failure strategy is
                                      triggered.
  -----------------------------------------------------------------------

**Important:** The rollback template and the service's Kubernetes
manifests must support the intended rollback behavior. A rollback is not
a guarantee that every kind of application or infrastructure failure can
be automatically repaired. Verify the execution logs and Kubernetes
rollout history after a failure.

Example Kubernetes checks:

``` bash
kubectl rollout history deployment/<deployment-name> -n nodeapp
kubectl rollout undo deployment/<deployment-name> -n nodeapp
kubectl rollout status deployment/<deployment-name> -n nodeapp
```

The `kubectl rollout undo` command is a manual Kubernetes recovery
command; it is not a substitute for validating the Harness rollback
step.

------------------------------------------------------------------------

## 4. Complete pipeline YAML

The following is a formatted reference version based on the supplied
configuration. Confirm the exact rollback and failure-strategy placement
against the schema accepted by your Harness Pipeline Studio version
before saving or executing it.

``` yaml
pipeline:
  id: NodeJSCICD_1
  name: NodeJSCICD-1
  description: Build the Node.js app image, push it to Docker Hub, require manual approval, and deploy it to the local Kubernetes cluster.

  clone:
    enabled: true
    connector: httpsgithubcomgsd00110110harness_demo
    repo: gsd00110110/harness-demo
    ref:
      type: branch
      name: main

  stages:
    - id: build
      name: Build and Push
      runtime: cloud
      platform:
        os: linux
        arch: amd64
      steps:
        - id: build_and_push
          name: Build and Push Image
          build:
            uses: buildAndPushToDocker
            with:
              connector: httpshubdockercomrepositorydockergsd00110110harnessgeneral
              repo: gsd00110110/harness
              tags:
                - v7

    - id: approve_deploy
      name: Approve Deployment
      steps:
        - id: manual_approval
          name: Manual Approval
          timeout: 1d
          approval:
            uses: harness
            with:
              message: Please review and approve the deployment to local Kubernetes.
              user-groups:
                - approvers_group
              approvers-min-count: 1
              block-executor: false

    - id: deploy
      name: Deploy to Local K8s
      service:
        items:
          - id: nodeapp
      environment:
        items:
          - id: local_k8s
            deploy-to: local_k8s_infra
      runtime:
        kubernetes:
          connector: connector_K8sCluster_a5eb
          namespace: nodeapp
      steps:
        - id: k8sRollingDeployStep
          name: Kubernetes Rolling Deploy
          template:
            uses: k8sRollingDeployStep

      rollback:
        - group:
            id: k8sRollingRollback
            name: Kubernetes Rolling Rollback
            steps:
              - id: k8sRollingRollbackStep
                name: Kubernetes Rolling Rollback
                template:
                  uses: k8sRollingRollbackStep

      on-failure:
        errors: all
        action: stage-rollback
```

> **YAML validation note:** This is a readable, consistently indented
> rendering of the configuration you supplied, not a claim that every
> Harness account or pipeline schema version accepts it unchanged. Use
> Pipeline Studio validation as the final authority. In particular,
> verify the placement and schema of `rollback` and `on-failure` in your
> Harness v1 pipeline editor.

------------------------------------------------------------------------

## 5. Harness setup checklist

Complete these checks before running the pipeline.

### 5.1 Connectors

-   [ ] GitHub connector `httpsgithubcomgsd00110110harness_demo` exists.
-   [ ] GitHub connector test connection succeeds.
-   [ ] Docker Hub connector
    `httpshubdockercomrepositorydockergsd00110110harnessgeneral` exists.
-   [ ] Docker Hub connector test connection succeeds.
-   [ ] Kubernetes connector `connector_K8sCluster_a5eb` exists.
-   [ ] Kubernetes connector can reach the target cluster.

### 5.2 Kubernetes access and Delegate

-   [ ] The target Kubernetes cluster is running and reachable.
-   [ ] If the cluster is local or private, a Harness Delegate is
    running in an environment that can reach it.
-   [ ] The Delegate is healthy and has the required permissions.
-   [ ] The Kubernetes connector is configured to use the appropriate
    access method.
-   [ ] The `nodeapp` namespace exists, or the deployment configuration
    is set up to create it.

**Network reminder:** A local Kubernetes cluster running on a developer
laptop is not automatically reachable from Harness cloud infrastructure.
A Delegate with suitable network connectivity and permissions is
generally required for Harness to access a local or private cluster.

### 5.3 Service, environment, and templates

-   [ ] Harness Service `nodeapp` exists.
-   [ ] The Service has the required Kubernetes manifests configured.
-   [ ] The Service has an artifact configured that matches the image
    produced by the build stage.
-   [ ] Harness Environment `local_k8s` exists.
-   [ ] Infrastructure definition `local_k8s_infra` exists under that
    environment.
-   [ ] Template `buildAndPushToDocker` is accessible.
-   [ ] Template `k8sRollingDeployStep` is accessible.
-   [ ] Template `k8sRollingRollbackStep` is accessible.

### 5.4 Approval and Docker Hub

-   [ ] User group `approvers_group` exists at project scope, or the
    YAML references the correct scope-qualified group.
-   [ ] At least one eligible user belongs to the approval group.
-   [ ] The approver has the required project permissions.
-   [ ] Docker Hub repository `gsd00110110/harness` exists.
-   [ ] The configured Docker Hub credentials can push to that
    repository.

------------------------------------------------------------------------

## 6. Pre-demo checklist

Before presenting the pipeline:

-   [ ] Pipeline appears valid in Harness Pipeline Studio.
-   [ ] GitHub, Docker Hub, and Kubernetes connectors pass their
    connection tests.
-   [ ] Dockerfile exists in the root of the GitHub repository, or the
    build template is configured with the correct Dockerfile path.
-   [ ] Image tag `v7` is intentional for the demo, or has been replaced
    with a unique tag.
-   [ ] The image repository exists and is accessible.
-   [ ] The Service artifact configuration points to the image that the
    pipeline builds.
-   [ ] Kubernetes namespace and deployment manifests are correct.
-   [ ] The Delegate is healthy if required for cluster connectivity.
-   [ ] The approver is available and knows how to approve the
    execution.
-   [ ] Rollback template and failure strategy have been validated.

------------------------------------------------------------------------

## 7. Demo execution procedure

### Step 1 --- Run the pipeline

1.  Open the Harness project.
2.  Navigate to **Pipelines**.
3.  Open `NodeJSCICD-1`.
4.  Select **Run**.
5.  Confirm the configured source branch and runtime inputs, if
    prompted.
6.  Start the execution.

### Step 2 --- Show the build stage

1.  Open the `Build and Push` stage.
2.  Show the source-code checkout.
3.  Open the build step logs.
4.  Confirm that the Docker image builds successfully.
5.  Confirm that the push to Docker Hub succeeds.

### Step 3 --- Verify Docker Hub

Open the Docker Hub repository:

``` text
gsd00110110/harness
```

Confirm that the expected tag is available:

``` text
v7
```

### Step 4 --- Demonstrate manual approval

1.  Show that the pipeline is waiting at `Approve Deployment`.
2.  Sign in as a member of `approvers_group`, if required.
3.  Review the approval message and execution details.
4.  Approve the deployment.
5.  Return to the pipeline execution and confirm that it continues.

### Step 5 --- Watch the Kubernetes deployment

1.  Open the `Deploy to Local K8s` stage.
2.  Show the rolling deployment step and its logs.
3.  Wait for the stage to complete.
4.  Verify the workload in Kubernetes:

``` bash
kubectl get all -n nodeapp
kubectl get pods -n nodeapp
```

5.  Confirm that the pods are in the expected running and ready state.

### Step 6 --- Demonstrate rollback (optional)

Use a controlled test environment only.

1.  Prepare a deployment failure that is safe to demonstrate.
2.  Run the pipeline.
3.  Allow the build and approval steps to complete.
4.  Observe the deployment failure.
5.  Show the rollback step and its execution logs.
6.  Verify the resulting Kubernetes workload and rollout history.

------------------------------------------------------------------------

## 8. Optional failure demonstrations

  -----------------------------------------------------------------------
  Scenario                            Expected behavior
  ----------------------------------- -----------------------------------
  Reject manual approval              Approval step fails or is rejected;
                                      deployment does not proceed.

  Approval times out                  Approval step fails after the
                                      configured one-day timeout;
                                      deployment does not proceed.

  GitHub authentication fails         Source checkout fails.

  Docker Hub authentication fails     Image push fails.

  Kubernetes connector cannot connect Deployment cannot access the
                                      cluster and fails.

  Deployment fails                    Configured stage failure strategy
                                      attempts the stage rollback.

  Rollback itself fails               Rollback logs show the error;
                                      investigate the cluster and
                                      deployment state manually.
  -----------------------------------------------------------------------

Do not intentionally break a shared or production environment for a
demonstration. Use a dedicated test namespace and a known recovery
procedure.

------------------------------------------------------------------------

## 9. Common pitfalls and troubleshooting

### 9.1 Manual approval field names

For the supplied Harness v1 configuration, the approval fields are:

``` yaml
user-groups:
  - approvers_group
approvers-min-count: 1
```

Do not replace these with the alternative names `groups` or
`min-approvers` when using this schema. Incorrect field names can cause
Harness to ignore the group configuration and produce an error such as:

``` text
At least 1 User Group or Service Account
```

Check that the group exists at the correct scope and that the referenced
name matches the configured group.

### 9.2 Do not mix pipeline schema versions

Keep the pipeline syntax consistent with the version used by Pipeline
Studio. Do not mix older v0-style structures, such as `type:` or
`spec:`, into a v1 pipeline unless the specific field is explicitly
required by the schema.

### 9.3 Build succeeds, but deployment uses an old image

Possible causes:

-   The Service artifact is not linked to the image built by the current
    pipeline execution.
-   The deployment uses a hardcoded or stale image tag.
-   A mutable tag such as `v7` is reused and image-pull behavior is not
    as expected.

Recommended checks:

-   Confirm the exact image repository and tag in the build logs.
-   Confirm the artifact selected by the Harness Service.
-   Prefer a unique image tag per pipeline run.
-   Verify the image reference in the deployed Kubernetes workload.

### 9.4 Kubernetes cluster is unreachable

Check:

-   Kubernetes connector configuration and credentials.
-   Delegate health and connectivity, if a Delegate is required.
-   Network routes, firewall rules, and DNS.
-   Kubernetes API server reachability from the Delegate.
-   Kubernetes RBAC permissions assigned to the configured identity.

### 9.5 Pods do not become ready

Run:

``` bash
kubectl get pods -n nodeapp
kubectl describe pods -n nodeapp
kubectl get events -n nodeapp --sort-by=.metadata.creationTimestamp
kubectl get deployments -n nodeapp
```

Look for image-pull errors, failed probes, insufficient resources,
scheduling problems, and application startup errors.

### 9.6 Rollback does not restore the expected version

Check:

-   Whether the deployment step created a revision that Kubernetes can
    roll back to.
-   Whether the rollback template targets the correct workload.
-   Whether the failure strategy actually triggered.
-   Whether the previous ReplicaSet or revision is still available.
-   Whether the rollback logs contain permission or connectivity errors.

------------------------------------------------------------------------

## 10. Useful Kubernetes commands

Run these commands from a terminal configured to access the target
cluster.

``` bash
# Confirm cluster access
kubectl cluster-info

# List namespaces
kubectl get namespaces

# Create the application namespace if it does not exist
kubectl create namespace nodeapp

# View resources in the application namespace
kubectl get all -n nodeapp

# View pods
kubectl get pods -n nodeapp

# View deployments
kubectl get deployments -n nodeapp

# Inspect a pod
kubectl describe pod <pod-name> -n nodeapp

# View recent namespace events
kubectl get events -n nodeapp --sort-by=.metadata.creationTimestamp

# Check rollout status
kubectl rollout status deployment/<deployment-name> -n nodeapp

# View rollout history
kubectl rollout history deployment/<deployment-name> -n nodeapp

# Roll back the deployment manually, if required
kubectl rollout undo deployment/<deployment-name> -n nodeapp
```

Replace placeholders such as `<pod-name>` and `<deployment-name>` with
actual resource names.

------------------------------------------------------------------------

## 11. Secrets and credentials --- basic guidance

Harness connectors commonly use credentials to authenticate to external
systems. Examples include:

-   GitHub personal access tokens or supported GitHub authentication.
-   Docker Hub username and access token.
-   Kubernetes credentials or supported cluster authentication.

Recommended practices:

1.  Store sensitive values using Harness Secrets Management or the
    supported secret manager integration.
2.  Reference secrets from connectors or pipeline configuration rather
    than writing credentials directly in YAML.
3.  Use tokens with only the permissions required for the task.
4.  Avoid printing secrets in build logs.
5.  Rotate credentials according to your organization's security policy.
6.  Do not commit tokens, passwords, kubeconfig files, or private keys
    to GitHub.

**Important:** The pipeline YAML should contain connector references,
not the raw credentials behind those connectors.

------------------------------------------------------------------------

## 12. Production-readiness improvements

This pipeline is suitable as a training example. Before using the same
pattern for production, consider the following improvements:

-   **Unique image tags:** Use the commit SHA or pipeline execution
    number instead of a fixed `v7` tag.
-   **Artifact traceability:** Deploy the exact image built in the same
    pipeline execution.
-   **Automated tests:** Add unit tests, dependency checks, and image
    scanning before approval.
-   **Environment separation:** Use separate Development, QA, and
    Production environments.
-   **Approval controls:** Enforce separation of duties where required.
-   **Deployment verification:** Add health checks and appropriate
    deployment verification.
-   **Rollback validation:** Test rollback behavior regularly in a
    non-production environment.
-   **Least privilege:** Restrict GitHub, Docker Hub, and Kubernetes
    permissions to the minimum necessary.
-   **Auditability:** Retain pipeline execution logs and approval
    history according to organizational policy.

------------------------------------------------------------------------

## 13. Quick revision

  -----------------------------------------------------------------------
  Question                            Answer
  ----------------------------------- -----------------------------------
  What is Harness?                    A platform for automating software
                                      delivery and related DevOps
                                      workflows.

  What is a pipeline?                 A workflow containing stages and
                                      steps.

  What does the GitHub connector do?  Authenticates Harness to the source
                                      repository.

  What does the Docker Hub connector  Authenticates the image push to
  do?                                 Docker Hub.

  Why use a Delegate?                 To let Harness reach and execute
                                      tasks against infrastructure or
                                      systems that require a Delegate in
                                      the user's network.

  What is the approval stage for?     To require human approval before
                                      deployment.

  What is a Harness Service?          The application deployment
                                      definition, including its artifact
                                      and manifests.

  What is an Environment?             The target environment in which the
                                      service is deployed.

  What is a rolling deployment?       A gradual replacement of
                                      application instances or pods.

  What is rollback?                   An attempt to restore a previous
                                      deployment state after a failure.

  Where is this application deployed? Kubernetes namespace `nodeapp`.
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 14. Final training summary

The `NodeJSCICD-1` pipeline demonstrates a basic end-to-end CI/CD
workflow using Harness:

1.  Clone the Node.js application source code from GitHub.
2.  Build a Docker image using the reusable build template.
3.  Push the image to Docker Hub.
4.  Pause for approval from `approvers_group`.
5.  Deploy the `nodeapp` Service to the `local_k8s` environment and
    `nodeapp` Kubernetes namespace.
6.  Trigger the configured rolling rollback when the deployment stage
    fails and the failure strategy applies.

**Key learning:** Connectors provide access, the pipeline defines the
workflow, templates provide reusable actions, approval adds a manual
control point, and the deployment and rollback steps manage application
delivery to Kubernetes.
