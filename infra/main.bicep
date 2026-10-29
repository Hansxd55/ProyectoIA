targetScope = 'resourceGroup'

@description('Globally unique Azure Container Registry name.')
param registryName string
@description('Container Apps managed environment name.')
param environmentName string
@description('Container App name.')
param containerAppName string
@description('Azure region for regional resources.')
param location string = 'westus'
@description('Container image, including registry and tag.')
param image string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
@secure()
param functionBaseUrl string
@secure()
param functionKey string
@secure()
param appUsername string
@secure()
param appPasswordHash string
@secure()
param invoiceApiBaseUrl string
@secure()
param invoiceApiUsername string
@secure()
param invoiceApiPassword string

resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: registryName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
    publicNetworkAccess: 'Enabled'
  }
}

resource logs 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${containerAppName}-logs'
  location: location
  properties: {
    retentionInDays: 30
    sku: {
      name: 'PerGB2018'
    }
  }
}

resource environment 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: environmentName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logs.properties.customerId
        sharedKey: logs.listKeys().primarySharedKey
      }
    }
  }
}

resource app 'Microsoft.App/containerApps@2023-05-01' = {
  name: containerAppName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
      }
      registries: [
        {
          server: registry.properties.loginServer
          username: registry.listCredentials().username
          passwordSecretRef: 'registry-password'
        }
      ]
      secrets: [
        {
          name: 'registry-password'
          value: registry.listCredentials().passwords[0].value
        }
        {
          name: 'function-base-url'
          value: functionBaseUrl
        }
        {
          name: 'function-key'
          value: functionKey
        }
        {
          name: 'app-username'
          value: appUsername
        }
        {
          name: 'app-password-hash'
          value: appPasswordHash
        }
        {
          name: 'invoice-api-base-url'
          value: invoiceApiBaseUrl
        }
        {
          name: 'invoice-api-username'
          value: invoiceApiUsername
        }
        {
          name: 'invoice-api-password'
          value: invoiceApiPassword
        }
      ]
    }
    template: {
      containers: [
        {
          name: containerAppName
          image: image
          env: [
            {
              name: 'PORT'
              value: '3000'
            }
            {
              name: 'AZURE_FUNCTION_BASE_URL'
              secretRef: 'function-base-url'
            }
            {
              name: 'AZURE_FUNCTION_KEY'
              secretRef: 'function-key'
            }
            {
              name: 'APP_USERNAME'
              secretRef: 'app-username'
            }
            {
              name: 'APP_PASSWORD_HASH'
              secretRef: 'app-password-hash'
            }
            {
              name: 'INVOICE_API_BASE_URL'
              secretRef: 'invoice-api-base-url'
            }
            {
              name: 'INVOICE_API_USERNAME'
              secretRef: 'invoice-api-username'
            }
            {
              name: 'INVOICE_API_PASSWORD'
              secretRef: 'invoice-api-password'
            }
          ]
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 2
      }
    }
  }
}

resource acrPullRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(registry.id, containerAppName, 'acrpull-v2')
  scope: registry
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      '7f951dda-4ed3-4680-a7ca-43fe172d538d'
    )
    principalId: app.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

output appFqdn string = app.properties.configuration.ingress.fqdn
output registryLoginServer string = registry.properties.loginServer
output environmentId string = environment.id
