pipeline {
  agent none

  options {
    disableConcurrentBuilds()
  }

  stages {
    stage('build and deploy') {
      agent any
      steps {
        withCredentials([string(credentialsId: 'npm-token', variable: 'NPM_TOKEN')]) {
					sh 'yarn'
					sh 'yarn bootstrap'
					sh 'yarn clean'
					sh 'yarn build-all'
					sh 'yarn test'
        }
      }
    }
  }
  post {
    always {
      node("") {
        cleanWs()
      }
    }
  }
}
