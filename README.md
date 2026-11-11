NodeJSCICD-1 Pipeline: Training Guide
Flow: Clone the code → Build and push the image to Docker Hub → Manual approval → Deploy to Kubernetes (roll back if it fails)

1. Pipeline identity
pipeline:
  id: NodeJSCICD_1
  name: NodeJSCICD-1
  description: Build the Node.js app image, push it ... deploy it to the local Kubernetes cluster.
Line	Meaning
pipeline:	Root of every v1 pipeline.
id	Unique identifier. Only letters, numbers and underscores are allowed. It can't be changed after creation.
name	Display name shown in the UI.
description	One-line purpose of the pipeline.
2. Source code checkout
  clone:
    enabled: true
    connector: httpsgithubcomgsd00110110harness_demo
    repo: gsd00110110/harness-demo
    ref:
      type: branch
      name: main
Line	Meaning
clone	Pipeline-level setting. The repo is cloned automatically before the stages that need it.
enabled: true	Turns the automatic clone on.
connector	The Harness GitHub connector used to authenticate.
repo	The repository, in owner/name form.
ref.type: branch	The ref is a branch, not a tag or commit.
ref.name: main	The branch to build.
3. Stage 1: Build and push (CI)
  stages:
    - id: build
      name: Build and Push
      runtime: cloud
      platform:
        os: linux
        arch: amd64
Line	Meaning
stages	Ordered list of stages. They run top to bottom.
id / name	Stage identifier and display name.
runtime: cloud	Runs on Harness-hosted cloud infrastructure, so you don't need your own build machine.
platform.os / arch	Linux on amd64 (x86-64).
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
Line	Meaning
steps	Actions inside the stage.
build: uses: buildAndPushToDocker	Uses a reusable template that builds the Docker image and pushes it.
with	Inputs passed to the template.
connector	The Docker Hub connector used to authenticate the push.
repo: gsd00110110/harness	The Docker Hub repository the image goes to.
tags: - v7	The image is published as gsd00110110/harness:v7.
Demo note: The tag is hardcoded to v7, so every run overwrites the same tag. In a real pipeline, use a unique tag per run. For example, you could use the pipeline's run number instead.

4. Stage 2: Manual approval gate
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
              user-groups: [approvers_group]
              approvers-min-count: 1
              block-executor: false
Line	Meaning
approval: uses: harness	Uses Harness's built-in manual approval. The other options are jira, servicenow and custom.
timeout: 1d	How long to wait. After 1 day with no response, the step fails. It's a step-level setting, not part of with.
message	Text shown to approvers.
user-groups	Groups whose members can approve. The group must exist at project scope. Use account.<id> or org.<id> for groups at those scopes.
approvers-min-count: 1	Number of approvals needed.
block-executor: false	The person who started the run can also approve. Set it to true to enforce separation of duties.
This stage runs only after the image push succeeds. If the approval is rejected or times out, the deploy stage is skipped.

5. Stage 3: Deploy to Kubernetes (CD)
    - id: deploy
      name: Deploy to Local K8s
      service:
        items:
          - id: nodeapp
      environment:
        items:
          - id: local_k8s
            deploy-to: local_k8s_infra
Line	Meaning
service	What to deploy. nodeapp is a Harness Service that holds the manifests and artifact.
environment	Where to deploy. local_k8s is a Harness Environment.
deploy-to	The infrastructure definition inside that environment.
      runtime:
        kubernetes:
          connector: connector_K8sCluster_a5eb
          namespace: nodeapp
Line	Meaning
runtime.kubernetes	The stage runs against a Kubernetes cluster.
connector	The Kubernetes cluster connector.
namespace	The target namespace in the cluster.
      steps:
        - id: k8sRollingDeployStep
          name: Kubernetes Rolling Deploy
          template:
            uses: k8sRollingDeployStep
A rolling deploy replaces pods gradually, which avoids downtime. The step uses a template.
6. Rollback and failure handling
      rollback:
        - group:
            id: k8sRollingRollback
            name: Kubernetes Rolling Rollback
            steps:
              - id: k8sRollingRollbackStep
                name: Kubernetes Rolling Rollback
                template:
                  uses: k8sRollingRollbackStep
          id: group_1
          name: group_1
      on-failure:
        errors: all
        action: stage-rollback
Line	Meaning
rollback	Steps that run only when a rollback is triggered.
group	A named group of rollback steps.
on-failure.errors: all	Applies to any type of error.
action: stage-rollback	If the deploy fails, run the rollback steps above.
7. Setup checklist
Prerequisites in Harness

 GitHub connector httpsgithubcomgsd00110110harness_demo exists and its test connection passes.
 Docker Hub connector httpshubdockercomrepositorydockergsd00110110harnessgeneral exists and passes.
 Kubernetes connector connector_K8sCluster_a5eb exists and passes.
 The cluster is reachable. If it's a local cluster, a delegate must be running with access to it.
 Service nodeapp exists and has manifests and an artifact configured.
 Environment local_k8s and infrastructure local_k8s_infra exist.
 Namespace nodeapp exists, or the infrastructure is set to create it.
 Templates buildAndPushToDocker, k8sRollingDeployStep and k8sRollingRollbackStep are accessible.
 User group approvers_group exists at project scope.
 That group has at least one user who can approve in the project.
 The Docker Hub repo gsd00110110/harness exists.
Pre-demo checks

 The pipeline shows as valid in Pipeline Studio.
 The tag is updated or made dynamic.
 The Dockerfile exists in the repo root.
 Presenters know who approves.
Demo script

Run the pipeline.
Show the build stage logs.
Confirm the image appears on Docker Hub.
Show the pipeline pausing at Approve Deployment.
Approve it as a member of approvers_group.
Watch the rolling deploy.
Verify the pods are running in the nodeapp namespace.
Optional failure demos

Reject the approval to show the deploy stage being skipped.
Break the deploy to show the rollback.
Pitfalls to mention

In v1, the approval field names are user-groups and approvers-min-count. Using groups or min-approvers makes Harness ignore them, and the step fails with "At least 1 User Group or Service Account".
Don't mix v0 syntax, such as type: or spec:, into a v1 pipeline.