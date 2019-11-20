# Extension sanity check tests

This directory contains a set of YAML configuration files for sanity testing the latest development release of this extension published by [OpenShift VSTS](https://marketplace.visualstudio.com/manage/publishers/openshiftvsts).
To see how to deploy a development version refer to [deploying to staging](../docs/develpoment.md#to-staging).
The tests need to be triggered manually and the cluster connection (`integration_test_connection_openshift`) needs to be updated prior to doing so.
There is no default/standby OpenShift cluster configured at the moment.
