import React from 'react';
import {
  PageSection,
  Title,
  Content,
  Spinner,
  EmptyState,
  EmptyStateBody,
  SearchInput,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  ToolbarGroup,
  Button,
  Bullseye,
  Label,
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Breadcrumb,
  BreadcrumbItem,
  Card,
  CardBody,
  CardTitle,
  Tabs,
  Tab,
  TabTitleText,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Dropdown,
  Flex,
  FlexItem,
  FormGroup,
  TextInput,
  DropdownItem,
  DropdownList,
  MenuToggle,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { EllipsisVIcon, AwsIcon, DatabaseIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import { useConnections, useDeleteConnection } from './useCatalogApi';
import CreateConnectionModal from './CreateConnectionModal';

interface ConnectionsTabProps {
  project: string;
  connectionName?: string;
}

const ConnectionsTab: React.FC<ConnectionsTabProps> = ({ project, connectionName }) => {
  const [filterValue, setFilterValue] = React.useState('');
  const [showCreate, setShowCreate] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = React.useState('');
  const [openKebab, setOpenKebab] = React.useState<string | null>(null);
  const [detailKebabOpen, setDetailKebabOpen] = React.useState(false);
  const connectionsQuery = useConnections(project);
  const deleteMutation = useDeleteConnection();
  const connections = connectionsQuery.data || [];

  if (connectionName) {
    const conn = connections.find((c) => c.name === connectionName);

    if (connectionsQuery.isLoading) {
      return (
        <PageSection>
          <Bullseye style={{ minHeight: '400px' }}><Spinner /></Bullseye>
        </PageSection>
      );
    }

    if (!conn) {
      return (
        <PageSection>
          <Content>Connection not found.</Content>
        </PageSection>
      );
    }

    return (
      <>
        <PageSection style={{ paddingBottom: 0 }}>
          <Breadcrumb>
            <BreadcrumbItem>
              <Link to={`/ai-hub/data/collections?project=${project}&tab=connections`}>
                Connections &ndash; {project}
              </Link>
            </BreadcrumbItem>
            <BreadcrumbItem isActive>{connectionName}</BreadcrumbItem>
          </Breadcrumb>
          <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }} style={{ marginTop: '12px' }}>
            <FlexItem>
              <Title headingLevel="h1" size="2xl">{conn.displayName || connectionName}</Title>
            </FlexItem>
            <FlexItem>
              <Dropdown
                isOpen={detailKebabOpen}
                onOpenChange={setDetailKebabOpen}
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    variant="plain"
                    onClick={() => setDetailKebabOpen(!detailKebabOpen)}
                    isExpanded={detailKebabOpen}
                  >
                    <EllipsisVIcon />
                  </MenuToggle>
                )}
                popperProps={{ position: 'right' }}
              >
                <DropdownList>
                  <DropdownItem key="edit" onClick={() => setDetailKebabOpen(false)}>Edit</DropdownItem>
                  <DropdownItem key="delete" onClick={() => { setDetailKebabOpen(false); setDeleteTarget(connectionName!); }}>Delete</DropdownItem>
                </DropdownList>
              </Dropdown>
            </FlexItem>
          </Flex>
        </PageSection>

        <PageSection padding={{ default: 'noPadding' }}>
          <Tabs activeKey="overview" style={{ paddingLeft: '24px' }}>
            <Tab eventKey="overview" title={<TabTitleText>Overview</TabTitleText>}>
              <PageSection>
                <Card>
                  <CardTitle>Connection details</CardTitle>
                  <CardBody>
                    <DescriptionList isHorizontal>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Name</DescriptionListTerm>
                        <DescriptionListDescription>{conn.name}</DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Display name</DescriptionListTerm>
                        <DescriptionListDescription>{conn.displayName || '—'}</DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Type</DescriptionListTerm>
                        <DescriptionListDescription>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            {conn.connectionType === 's3' ? <AwsIcon /> : <DatabaseIcon />}
                            {conn.connectionType}
                          </span>
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Project</DescriptionListTerm>
                        <DescriptionListDescription>{conn.namespace || project}</DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Endpoint</DescriptionListTerm>
                        <DescriptionListDescription style={{ wordBreak: 'break-all' }}>{conn.endpoint || '—'}</DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Bucket</DescriptionListTerm>
                        <DescriptionListDescription>{conn.bucket || '—'}</DescriptionListDescription>
                      </DescriptionListGroup>
                      {conn.region && (
                        <DescriptionListGroup>
                          <DescriptionListTerm>Region</DescriptionListTerm>
                          <DescriptionListDescription>{conn.region}</DescriptionListDescription>
                        </DescriptionListGroup>
                      )}
                    </DescriptionList>
                  </CardBody>
                </Card>
              </PageSection>
            </Tab>
          </Tabs>
        </PageSection>
      </>
    );
  }

  const filtered = React.useMemo(() => {
    if (!filterValue) return connections;
    const q = filterValue.toLowerCase();
    return connections.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.displayName.toLowerCase().includes(q) ||
        c.endpoint.toLowerCase().includes(q) ||
        c.bucket.toLowerCase().includes(q),
    );
  }, [connections, filterValue]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync({ namespace: project, name: deleteTarget });
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <PageSection>
      <Title headingLevel="h2" size="xl" style={{ marginBottom: '16px' }}>
        Data connections
      </Title>
      <Toolbar>
        <ToolbarContent>
          <ToolbarItem>
            <SearchInput
              placeholder="Filter connections..."
              value={filterValue}
              onChange={(_event, value) => setFilterValue(value)}
              onClear={() => setFilterValue('')}
            />
          </ToolbarItem>
          <ToolbarItem>
            <Button
              variant="primary"
              onClick={() => setShowCreate(true)}
            >
              Create connection
            </Button>
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      {connectionsQuery.isLoading && (
        <Bullseye style={{ minHeight: '200px' }}>
          <Spinner />
        </Bullseye>
      )}

      {!connectionsQuery.isLoading && filtered.length === 0 && (
        <EmptyState titleText="No Data Connections found" icon={() => null}>
          <EmptyStateBody>
            {filterValue
              ? 'No connections match your filter.'
              : 'Create a Data Connection in your project to link storage credentials to catalog assets.'}
          </EmptyStateBody>
        </EmptyState>
      )}

      {!connectionsQuery.isLoading && filtered.length > 0 && (
        <Table aria-label="Connections table" variant="compact">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Display Name</Th>
              <Th>Type</Th>
              <Th>Project</Th>
              <Th>Endpoint</Th>
              <Th>Bucket</Th>
              <Th />
            </Tr>
          </Thead>
          <Tbody>
            {filtered.map((conn) => (
              <Tr key={`${conn.namespace}-${conn.name}`}>
                <Td dataLabel="Name">
                  <Link to={`/ai-hub/data/connections/${conn.name}?project=${project}`} style={{ fontWeight: 600 }}>
                    {conn.name}
                  </Link>
                </Td>
                <Td dataLabel="Display Name">{conn.displayName}</Td>
                <Td dataLabel="Type">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    {conn.connectionType === 's3' ? <AwsIcon /> : <DatabaseIcon />}
                    {conn.connectionType}
                  </span>
                </Td>
                <Td dataLabel="Project">{conn.namespace}</Td>
                <Td dataLabel="Endpoint">{conn.endpoint || '—'}</Td>
                <Td dataLabel="Bucket">{conn.bucket || '—'}</Td>
                <Td dataLabel="Actions" isActionCell>
                  <Dropdown
                    isOpen={openKebab === conn.name}
                    onOpenChange={(open) => setOpenKebab(open ? conn.name : null)}
                    toggle={(toggleRef) => (
                      <MenuToggle
                        ref={toggleRef}
                        variant="plain"
                        onClick={() => setOpenKebab(openKebab === conn.name ? null : conn.name)}
                        isExpanded={openKebab === conn.name}
                      >
                        <EllipsisVIcon />
                      </MenuToggle>
                    )}
                    popperProps={{ position: 'right' }}
                  >
                    <DropdownList>
                      <DropdownItem key="edit" onClick={() => setOpenKebab(null)}>
                        Edit
                      </DropdownItem>
                      <DropdownItem key="delete" onClick={() => { setDeleteTarget(conn.name); setOpenKebab(null); }}>
                        Delete
                      </DropdownItem>
                    </DropdownList>
                  </Dropdown>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {showCreate && (
        <CreateConnectionModal
          project={project}
          onClose={() => setShowCreate(false)}
        />
      )}

      {deleteTarget && (
        <Modal
          variant={ModalVariant.small}
          isOpen
          onClose={() => { setDeleteTarget(null); setDeleteConfirm(''); }}
          aria-label="Delete connection"
        >
          <ModalHeader title="Permanently delete connection?" />
          <ModalBody>
            <p style={{ marginBottom: '16px' }}><strong>{deleteTarget}</strong> and its data will be lost forever.</p>
            <FormGroup label="Type DELETE to confirm:" fieldId="delete-conn-confirm">
              <TextInput id="delete-conn-confirm" value={deleteConfirm} onChange={(_e, v) => setDeleteConfirm(v)} placeholder="DELETE" />
            </FormGroup>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteMutation.isPending}
              isDisabled={deleteConfirm !== 'DELETE'}
            >
              Delete
            </Button>
            <Button variant="link" onClick={() => { setDeleteTarget(null); setDeleteConfirm(''); }}>
              Cancel
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </PageSection>
  );
};

export default ConnectionsTab;
