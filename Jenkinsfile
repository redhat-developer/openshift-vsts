#!/usr/bin/env groovy

node('rhel8'){
    stage('Checkout repo') {
        deleteDir()
        git url: 'https://github.com/redhat-developer/openshift-vsts',
            branch: "${BRANCH}"
    }

    stage('Install requirements') {
        def nodeHome = tool 'nodejs-lts'
        env.PATH="${env.PATH}:${nodeHome}/bin"
        sh "npm run setup"
    }

    stage('Build') {
        sh "npm install"
        sh "npm run build"
    }

    withEnv(['JUNIT_REPORT_PATH=report.xml']) {
        stage('Test') {
            wrap([$class: 'Xvnc']) {
                sh "npm run test:report:ci"
                junit '**/test-report.xml'
            }
        }
    }

    stage('Package') {
        sh "npm run extension:create"
    }

    if(params.UPLOAD_LOCATION) {
        stage('Snapshot') {
            def filesToPush = findFiles(glob: '**/*.vsix')
            def extensionJson = readJSON file: 'vss-extension.json'
            sh "rsync -Pzrlt --rsh=ssh --protocol=28 ${filesToPush[0].path} ${UPLOAD_LOCATION}/snapshots/openshift-vsts/openshift-vsts-${extensionJson.version}-${env.BUILD_NUMBER}.vsix"
        }
    }
    
    if(publishToMarketPlace.equals('true')){
        timeout(time:5, unit:'DAYS') {
            input message:'Approve deployment?', submitter: 'jmaury,lstocchi'
        }

        stage("Publish to Marketplace") {
            withCredentials([[$class: 'StringBinding', credentialsId: 'vscode_java_marketplace', variable: 'TOKEN']]) {
                def vsix = findFiles(glob: '**/*.vsix')
                sh "npm run extension:publish"
            }
            archive includes:"**/*.vsix"

            stage "Promote the build to stable"
            def vsix = findFiles(glob: '**/*.vsix')
            def extensionJson = readJSON file: 'vss-extension.json'
            sh "rsync -Pzrlt --rsh=ssh --protocol=28 ${vsix[0].path} ${UPLOAD_LOCATION}/stable/openshift-vsts/openshift-vsts-${extensionJson.version}-${env.BUILD_NUMBER}.vsix"
        }
    }
}