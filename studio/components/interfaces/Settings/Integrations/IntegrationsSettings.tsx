import { useCallback, useState } from 'react'
import {
  ScaffoldContainer,
  ScaffoldDivider,
  ScaffoldSectionContent,
  ScaffoldSection,
  ScaffoldSectionDetail,
} from 'components/layouts/Scaffold'
import { useIntegrationsGitHubInstalledConnectionDeleteMutation } from 'data/integrations/integrations-github-connection-delete-mutation'
import { useOrgIntegrationsQuery } from 'data/integrations/integrations-query-org-only'
import { useIntegrationsVercelInstalledConnectionDeleteMutation } from 'data/integrations/integrations-vercel-installed-connection-delete-mutation'
import { useVercelProjectsQuery } from 'data/integrations/integrations-vercel-projects-query'
import { IntegrationName, IntegrationProjectConnection } from 'data/integrations/integrations.types'
import { getIntegrationConfigurationUrl } from 'lib/integration-utils'
import { IntegrationConnectionItem } from './../../Organization/IntegrationSettings/OrganizationIntegration'
import SidePanelGitHubRepoLinker from './../../Organization/IntegrationSettings/SidePanelGitHubRepoLinker'
import SidePanelVercelProjectLinker from './../../Organization/IntegrationSettings/SidePanelVercelProjectLinker'
import { useSelectedOrganization } from 'hooks'
import { useSidePanelsStateSnapshot } from 'state/side-panels'
import { Markdown } from 'components/interfaces/Markdown'
import { BASE_PATH } from 'lib/constants'
import {
  EmptyIntegrationConnection,
  IntegrationConnectionHeader,
  IntegrationInstallation,
} from 'components/interfaces/Integrations/IntegrationPanels'
import { pluralize } from 'lib/helpers'
import { useProjectContext } from 'components/layouts/ProjectLayout/ProjectContext'
import {
  Button,
  FormControl_Shadcn_,
  FormDescription_Shadcn_,
  FormField_Shadcn_,
  FormItem_Shadcn_,
  FormLabel_Shadcn_,
  Form_Shadcn_,
  Input,
  Switch,
  cn,
} from 'ui'
import * as z from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const IntegrationImageHandler = ({ title }: { title: 'vercel' | 'github' }) => {
  return (
    <img
      className="border rounded-lg shadow w-48 mt-6 border-body"
      src={`${BASE_PATH}/img/integrations/covers/${title}-cover.png`}
      alt={`${title} cover`}
    />
  )
}

const IntegrationSettings = () => {
  const org = useSelectedOrganization()
  const { data } = useOrgIntegrationsQuery({ orgSlug: org?.slug })
  const sidePanelsStateSnapshot = useSidePanelsStateSnapshot()

  const projectContext = useProjectContext()

  const vercelIntegrations = data
    ?.filter((integration) => integration.integration.name === 'Vercel')
    .map((integration) => {
      if (integration.metadata && integration.integration.name === 'Vercel') {
        const avatarSrc =
          !integration.metadata.account.avatar && integration.metadata.account.type === 'Team'
            ? `https://vercel.com/api/www/avatar?teamId=${integration.metadata.account.team_id}&s=48`
            : `https://vercel.com/api/www/avatar/${integration.metadata.account.avatar}?s=48`

        integration['metadata']['account']['avatar'] = avatarSrc
      }

      return integration
    })

  const githubIntegrations = data?.filter(
    (integration) => integration.integration.name === 'GitHub'
  )

  // We're only supporting one Vercel integration per org for now
  // this will need to be updated when we support multiple integrations
  const vercelIntegration = vercelIntegrations?.[0]
  const { data: vercelProjectsData } = useVercelProjectsQuery(
    {
      organization_integration_id: vercelIntegration?.id,
    },
    { enabled: vercelIntegration?.id !== undefined }
  )
  const vercelProjectCount = vercelProjectsData?.length ?? 0

  const onAddVercelConnection = useCallback(
    (integrationId: string) => {
      sidePanelsStateSnapshot.setVercelConnectionsIntegrationId(integrationId)
      sidePanelsStateSnapshot.setVercelConnectionsOpen(true)
    },
    [sidePanelsStateSnapshot]
  )

  const onAddGitHubConnection = useCallback(
    (integrationId: string) => {
      sidePanelsStateSnapshot.setGithubConnectionsIntegrationId(integrationId)
      sidePanelsStateSnapshot.setGithubConnectionsOpen(true)
    },
    [sidePanelsStateSnapshot]
  )

  const { mutateAsync: deleteVercelConnection } =
    useIntegrationsVercelInstalledConnectionDeleteMutation()

  const onDeleteVercelConnection = useCallback(
    async (connection: IntegrationProjectConnection) => {
      await deleteVercelConnection({
        id: connection.id,
        organization_integration_id: connection.organization_integration_id,
        orgSlug: org?.slug,
      })
    },
    [deleteVercelConnection, org?.slug]
  )

  const { mutateAsync: deleteGitHubConnection } =
    useIntegrationsGitHubInstalledConnectionDeleteMutation()

  const onDeleteGitHubConnection = useCallback(
    async (connection: IntegrationProjectConnection) => {
      await deleteGitHubConnection({
        connectionId: connection.id,
        integrationId: connection.organization_integration_id,
        orgSlug: org?.slug,
      })
    },
    [deleteGitHubConnection, org?.slug]
  )

  /**
   * Vercel markdown content
   */

  const VercelTitle = `Vercel Integration`

  const VercelDetailsSection = `

Connect your Vercel teams to your Supabase organization.  
`

  const VercelContentSectionTop = `

### How does the Vercel integration work?

Supabase will keep the right environment variables up to date in each of the projects you assign to a Supabase project. 
You can also link multiple Vercel Projects to the same Supabase project.
`

  const VercelContentSectionBottom =
    vercelProjectCount > 0 && vercelIntegration !== undefined
      ? `
Your Vercel connection has access to ${vercelProjectCount} Vercel Projects. 
You can change the scope of the access for Supabase by configuring 
[here](${getIntegrationConfigurationUrl(vercelIntegration)}).
`
      : ''

  const VercelSection = () => (
    <ScaffoldContainer>
      <ScaffoldSection>
        <ScaffoldSectionDetail title={VercelTitle}>
          <Markdown content={VercelDetailsSection} />
          <IntegrationImageHandler title="vercel" />
        </ScaffoldSectionDetail>
        <ScaffoldSectionContent>
          <Markdown content={VercelContentSectionTop} />
          {vercelIntegrations &&
            vercelIntegrations.length > 0 &&
            vercelIntegrations
              .filter((x) =>
                x.connections.find((x) => x.supabase_project_ref === projectContext.project?.ref)
              )
              .map((integration, i) => {
                const ConnectionHeaderTitle = `${
                  integration.connections.length
                } project ${pluralize(integration.connections.length, 'connection')} `

                return (
                  <div key={integration.id}>
                    <IntegrationInstallation title={'Vercel'} integration={integration} />
                    {integration.connections.length > 0 ? (
                      <>
                        <IntegrationConnectionHeader
                          title={ConnectionHeaderTitle}
                          markdown={`Repository connections for Vercel`}
                        />
                        <ul className="flex flex-col">
                          {integration.connections.map((connection) => (
                            <div
                              key={connection.id}
                              className="relative flex flex-col -gap-[1px] [&>li]:pb-0"
                            >
                              <IntegrationConnectionItem
                                connection={connection}
                                type={'Vercel' as IntegrationName}
                                onDeleteConnection={onDeleteVercelConnection}
                                className="!rounded-b-none !mb-0"
                              />
                              <div className="relative pl-8 ml-6 border-l border-scale-600 dark:border-scale-400 pb-3">
                                <div className="border-b border-l border-r rounded-b-md px-8 py-4">
                                  <FormThing />

                                  {/* <label className="text-sm text-light">Production branch</label>
                                  <Input /> */}
                                </div>
                              </div>
                            </div>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <IntegrationConnectionHeader
                        markdown={`### ${integration.connections.length} project ${pluralize(
                          integration.connections.length,
                          'connection'
                        )} Repository connections for Vercel`}
                      />
                    )}
                    <EmptyIntegrationConnection
                      onClick={() => onAddVercelConnection(integration.id)}
                    >
                      Add new project connection
                    </EmptyIntegrationConnection>
                  </div>
                )
              })}
          {VercelContentSectionBottom && (
            <Markdown content={VercelContentSectionBottom} className="text-lighter" />
          )}
        </ScaffoldSectionContent>
      </ScaffoldSection>
    </ScaffoldContainer>
  )

  const FormThing = () => {
    const FormSchema = z.object({
      marketing_emails: z.boolean().default(false).optional(),
      security_emails: z.boolean(),
    })

    const form = useForm<z.infer<typeof FormSchema>>({
      resolver: zodResolver(FormSchema),
      defaultValues: {
        security_emails: true,
      },
    })

    function onSubmit(data: z.infer<typeof FormSchema>) {
      // toast({
      //   title: 'You submitted the following values:',
      //   description: (
      //     <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
      //       <code className="text-white">{JSON.stringify(data, null, 2)}</code>
      //     </pre>
      //   ),
      // })
    }

    return (
      <Form_Shadcn_ {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6">
          <div>
            <div className="flex flex-col gap-6">
              <FormField_Shadcn_
                control={form.control}
                name="marketing_emails"
                render={({ field }) => (
                  <FormItem_Shadcn_ className="flex flex-row items-center justify-between">
                    <div className="">
                      <FormLabel_Shadcn_ className="!text">
                        Auto sync environment variables for Production
                      </FormLabel_Shadcn_>
                      <FormDescription_Shadcn_ className="text-xs">
                        Deploy Edge Functions when merged into Production Beanch
                      </FormDescription_Shadcn_>
                    </div>
                    <FormControl_Shadcn_>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl_Shadcn_>
                  </FormItem_Shadcn_>
                )}
              />
              <FormField_Shadcn_
                control={form.control}
                name="security_emails"
                render={({ field }) => (
                  <FormItem_Shadcn_ className="flex flex-row items-center justify-between">
                    <div className="">
                      <FormLabel_Shadcn_ className="!text">
                        Auto sync enviroment variables for Database Preview Branches
                      </FormLabel_Shadcn_>
                      <FormDescription_Shadcn_ className="text-xs">
                        Deploy Edge Functions when merged into Production Beanch
                      </FormDescription_Shadcn_>
                    </div>
                    <FormControl_Shadcn_>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl_Shadcn_>
                  </FormItem_Shadcn_>
                )}
              />
              <FormField_Shadcn_
                control={form.control}
                name="security_emails"
                render={({ field }) => (
                  <FormItem_Shadcn_ className="flex flex-row items-center justify-between">
                    <div className="">
                      <FormLabel_Shadcn_ className="!text">
                        Auto manage Supabase Auth redirect URIs
                      </FormLabel_Shadcn_>
                      <FormDescription_Shadcn_ className="text-xs">
                        Deploy Edge Functions when merged into Production Beanch
                      </FormDescription_Shadcn_>
                    </div>
                    <FormControl_Shadcn_>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl_Shadcn_>
                  </FormItem_Shadcn_>
                )}
              />
            </div>
          </div>
          {/* <Button htmlType="submit">Submit</Button> */}
        </form>
      </Form_Shadcn_>
    )
  }

  /**
   * GitHub markdown content
   */

  const GitHubTitle = `GitHub Connections`

  const GitHubDetailsSection = `
Connect any of your GitHub repositories to a project.  
`

  const GitHubContentSectionTop = `

### How will GitHub connections work?

You will be able to connect a GitHub repository to a Supabase project. 
The GitHub app will watch for changes in your repository such as file changes, branch changes as well as pull request activity.

These connections will be part of a GitHub workflow that is currently in development.
`

  const GitHubSection = () => (
    <ScaffoldContainer>
      <ScaffoldSection>
        <ScaffoldSectionDetail title={GitHubTitle}>
          <Markdown content={GitHubDetailsSection} />
          <IntegrationImageHandler title="github" />
        </ScaffoldSectionDetail>
        <ScaffoldSectionContent>
          <Markdown content={GitHubContentSectionTop} />
          {githubIntegrations &&
            githubIntegrations.length > 0 &&
            githubIntegrations.map((integration, i) => {
              const ConnectionHeaderTitle = `${integration.connections.length} project ${pluralize(
                integration.connections.length,
                'connection'
              )} `

              return (
                <div key={integration.id}>
                  <IntegrationInstallation title={'GitHub'} integration={integration} />
                  {integration.connections.length > 0 ? (
                    <>
                      <IntegrationConnectionHeader
                        title={ConnectionHeaderTitle}
                        markdown={`Repository connections for GitHub`}
                      />
                      <ul className="flex flex-col">
                        {integration.connections.map((connection) => (
                          <IntegrationConnectionItem
                            key={connection.id}
                            connection={connection}
                            type={'GitHub' as IntegrationName}
                            onDeleteConnection={onDeleteGitHubConnection}
                          />
                        ))}
                      </ul>
                    </>
                  ) : (
                    <IntegrationConnectionHeader
                      markdown={`### ${integration.connections.length} project ${pluralize(
                        integration.connections.length,
                        'connection'
                      )} Repository connections for GitHub`}
                    />
                  )}
                  <EmptyIntegrationConnection onClick={() => onAddGitHubConnection(integration.id)}>
                    Add new project connection
                  </EmptyIntegrationConnection>
                </div>
              )
            })}
        </ScaffoldSectionContent>
      </ScaffoldSection>
    </ScaffoldContainer>
  )

  return (
    <>
      <VercelSection />
      <ScaffoldDivider />
      <GitHubSection />
      <SidePanelVercelProjectLinker />
      <SidePanelGitHubRepoLinker />
    </>
  )
}

export default IntegrationSettings