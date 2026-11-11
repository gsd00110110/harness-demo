# harness-demo
For local delegate run the docker run cli to create a delegate container in local desktop. you should see the delegate in connected status.

Manual Approval:
---------------
- id: approve_deploy
      name: Approve Deployment
      steps:
        - id: manual_approval
          name: Manual Approval
          approval:
            uses: harness
            with:
              timeout: 1d
              groups: [approvers_group]
              min-approvers: 1