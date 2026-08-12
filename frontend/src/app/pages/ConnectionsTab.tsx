import React from 'react';
import {
  PageSection,
  Title,
  Content,
  Spinner,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateActions,
  SearchInput,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  ToolbarGroup,
  ToolbarFilter,
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
  Select,
  SelectOption,
  SelectList,
  ExpandableSection,
  List,
  ListItem,
  Grid,
  GridItem,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td, type ThProps } from '@patternfly/react-table';
import {
  EllipsisVIcon,
  FilterIcon,
  SearchIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InProgressIcon,
} from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import { useConnections, useDeleteConnection } from './useCatalogApi';
import CreateConnectionModal from './CreateConnectionModal';

type ConnectionStatus = 'Unverified' | 'Verifying' | 'Verified' | 'Verification failed';

const STATUS_CONFIG: Record<ConnectionStatus, { color: 'grey' | 'blue' | 'green' | 'red'; icon?: React.ReactElement }> = {
  Unverified: { color: 'grey' },
  Verifying: { color: 'blue', icon: <InProgressIcon style={{ color: 'var(--pf-t--global--icon--color--status--info--default)', animation: 'connection-spin 2s linear infinite' }} /> },
  Verified: { color: 'green', icon: <CheckCircleIcon style={{ color: 'var(--pf-t--global--icon--color--status--success--default)' }} /> },
  'Verification failed': { color: 'red', icon: <ExclamationCircleIcon style={{ color: 'var(--pf-t--global--icon--color--status--danger--default)' }} /> },
};

const ConnectionStatusLabel: React.FC<{ status?: string; lastTested?: string }> = ({ status, lastTested }) => {
  const key = (status || 'Unverified') as ConnectionStatus;
  const config = STATUS_CONFIG[key] || STATUS_CONFIG.Unverified;
  return (
    <div>
      <Label variant="outline" color={config.color} icon={config.icon}>
        {key}
      </Label>
    </div>
  );
};

interface ConnectionsTabProps {
  project: string;
  connectionName?: string;
}

const ConnectionsTab: React.FC<ConnectionsTabProps> = ({ project, connectionName }) => {
  const userId = 'admin';
  const [filterValue, setFilterValue] = React.useState('');
  const [showCreate, setShowCreate] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = React.useState('');
  const [deleteLinkedExpanded, setDeleteLinkedExpanded] = React.useState(false);
  const [openKebab, setOpenKebab] = React.useState<string | null>(null);
  const [detailKebabOpen, setDetailKebabOpen] = React.useState(false);
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>([]);
  const [isTypeFilterOpen, setIsTypeFilterOpen] = React.useState(false);
  const [activeSortIndex, setActiveSortIndex] = React.useState<number | undefined>(undefined);
  const [activeSortDirection, setActiveSortDirection] = React.useState<'asc' | 'desc' | undefined>(undefined);
  const connectionsQuery = useConnections(project);
  const deleteMutation = useDeleteConnection();
  const [verifyOverrides, setVerifyOverrides] = React.useState<Record<string, { status: string; lastTested?: string }>>({});
  const rawConnections = connectionsQuery.data || [];
  const connections = rawConnections.map((c) => verifyOverrides[c.name] ? { ...c, ...verifyOverrides[c.name] } : c);

  const handleVerify = (connName: string) => {
    setVerifyOverrides((prev) => ({ ...prev, [connName]: { status: 'Verifying', lastTested: undefined } }));
    setTimeout(() => {
      const timestamp = new Date().toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
      setVerifyOverrides((prev) => ({ ...prev, [connName]: { status: 'Verified', lastTested: timestamp } }));
    }, 3000);
  };

  const allTypes = React.useMemo(() =>
    Array.from(new Set(connections.map((c) => c.connectionType))).sort(),
    [connections],
  );

  React.useEffect(() => {
    if (allTypes.length > 0 && selectedTypes.length === 0) {
      setSelectedTypes(allTypes);
    }
  }, [allTypes, selectedTypes.length]);

  if (connectionName) {
    const conn = connections.find((c) => c.name === connectionName);

    if (connectionsQuery.isLoading) {
      return (
        <PageSection>
          <Bullseye style={{ minHeight: 'var(--pf-t--global--spacer--6xl)' }}><Spinner /></Bullseye>
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
        <PageSection style={{ paddingBottom: '0' }}>
          <Breadcrumb>
            <BreadcrumbItem>
              <Link to={`/ai-hub/connections?project=${project}&tab=connections`}>
                Connections &ndash; {project}
              </Link>
            </BreadcrumbItem>
            <BreadcrumbItem isActive>{connectionName}</BreadcrumbItem>
          </Breadcrumb>
          <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }} style={{ marginTop: 'var(--pf-t--global--spacer--md)' }}>
            <FlexItem>
              <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsMd' }}>
                <FlexItem><Title headingLevel="h1" size="2xl">{conn.displayName || connectionName}</Title></FlexItem>
                <FlexItem><Label isCompact>Connection</Label></FlexItem>
              </Flex>
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
                  <DropdownItem key="test" onClick={() => { handleVerify(connectionName!); setDetailKebabOpen(false); }}>Verify connection</DropdownItem>
                  <DropdownItem key="edit" onClick={() => setDetailKebabOpen(false)}>Edit</DropdownItem>
                  <DropdownItem key="delete" onClick={() => { setDetailKebabOpen(false); setDeleteTarget(connectionName!); }}>Delete</DropdownItem>
                </DropdownList>
              </Dropdown>
            </FlexItem>
          </Flex>
        </PageSection>

        <PageSection padding={{ default: 'noPadding' }}>
          <Tabs activeKey="overview" style={{ paddingLeft: 'var(--pf-t--global--spacer--lg)' }}>
            <Tab eventKey="overview" title={<TabTitleText>Overview</TabTitleText>}>
              <PageSection>
                <Grid hasGutter>
                  <GridItem span={8}>
                    <Card>
                      <CardTitle>Connection details</CardTitle>
                      <CardBody>
                        <Grid hasGutter>
                          <GridItem span={6}>
                            <DescriptionList>
                              <DescriptionListGroup>
                                <DescriptionListTerm>Name</DescriptionListTerm>
                                <DescriptionListDescription>{conn.name}</DescriptionListDescription>
                              </DescriptionListGroup>
                              <DescriptionListGroup>
                                <DescriptionListTerm>Display name</DescriptionListTerm>
                                <DescriptionListDescription>{conn.displayName || '—'}</DescriptionListDescription>
                              </DescriptionListGroup>
                              <DescriptionListGroup>
                                <DescriptionListTerm>Endpoint</DescriptionListTerm>
                                <DescriptionListDescription style={{ wordBreak: 'break-all' }}>{conn.endpoint || '—'}</DescriptionListDescription>
                              </DescriptionListGroup>
                              <DescriptionListGroup>
                                <DescriptionListTerm>Bucket</DescriptionListTerm>
                                <DescriptionListDescription>{conn.bucket || '—'}</DescriptionListDescription>
                              </DescriptionListGroup>
                            </DescriptionList>
                          </GridItem>
                          <GridItem span={6}>
                            <DescriptionList>
                              <DescriptionListGroup>
                                <DescriptionListTerm>Type</DescriptionListTerm>
                                <DescriptionListDescription>{conn.connectionType}</DescriptionListDescription>
                              </DescriptionListGroup>
                              <DescriptionListGroup>
                                <DescriptionListTerm>Owner</DescriptionListTerm>
                                <DescriptionListDescription>{userId}</DescriptionListDescription>
                              </DescriptionListGroup>
                              <DescriptionListGroup>
                                <DescriptionListTerm>Created</DescriptionListTerm>
                                <DescriptionListDescription>5/20/2026, 11:30:00 AM by {userId}</DescriptionListDescription>
                              </DescriptionListGroup>
                              <DescriptionListGroup>
                                <DescriptionListTerm>Last modified</DescriptionListTerm>
                                <DescriptionListDescription>7/15/2026, 2:10:45 PM by {userId}</DescriptionListDescription>
                              </DescriptionListGroup>
                            </DescriptionList>
                          </GridItem>
                        </Grid>
                      </CardBody>
                    </Card>
                  </GridItem>

                  <GridItem span={4}>
                    <Card style={{ marginBottom: 'var(--pf-t--global--spacer--md)' }}>
                      <CardTitle>Verification status</CardTitle>
                      <CardBody>
                        <DescriptionList>
                          <DescriptionListGroup>
                            <DescriptionListTerm>Status</DescriptionListTerm>
                            <DescriptionListDescription><ConnectionStatusLabel status={conn.status} lastTested={conn.lastTested} /></DescriptionListDescription>
                          </DescriptionListGroup>
                          <DescriptionListGroup>
                            <DescriptionListTerm>Last tested</DescriptionListTerm>
                            <DescriptionListDescription>{conn.lastTested || '—'}</DescriptionListDescription>
                          </DescriptionListGroup>
                        </DescriptionList>
                        <Button variant="link" isSmall style={{ marginTop: 'var(--pf-t--global--spacer--md)', paddingLeft: 0 }} onClick={() => handleVerify(connectionName!)}>
                          Verify connection
                        </Button>
                      </CardBody>
                    </Card>
                    <Card>
                      <CardTitle>Connected assets</CardTitle>
                      <CardBody>
                        <List isPlain>
                          <ListItem>
                            <Link to={`/ai-hub/data/collections/underwriting/claims-data?project=${project}`}>claims-data</Link>
                          </ListItem>
                          <ListItem>
                            <Link to={`/ai-hub/data/collections/underwriting/risk-assessments?project=${project}`}>risk-assessments</Link>
                          </ListItem>
                          <ListItem>
                            <Link to={`/ai-hub/data/collections/forms/cgl-forms?project=${project}`}>cgl-forms</Link>
                          </ListItem>
                        </List>
                      </CardBody>
                    </Card>
                  </GridItem>
                </Grid>
              </PageSection>
            </Tab>
          </Tabs>
        </PageSection>
      </>
    );
  }

  const filtered = React.useMemo(() => {
    let result = connections;
    if (selectedTypes.length > 0 && selectedTypes.length < allTypes.length) {
      result = result.filter((c) => selectedTypes.includes(c.connectionType));
    }
    if (filterValue) {
      const q = filterValue.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.displayName.toLowerCase().includes(q) ||
          c.endpoint.toLowerCase().includes(q) ||
          c.bucket.toLowerCase().includes(q),
      );
    }
    return result;
  }, [connections, filterValue, selectedTypes, allTypes.length]);

  const sortableColumns = ['name', 'connectionType', 'status'] as const;
  const getSortableValue = (conn: typeof connections[number], key: typeof sortableColumns[number]): string => {
    switch (key) {
      case 'name': return conn.name.toLowerCase();
      case 'connectionType': return conn.connectionType.toLowerCase();
      case 'status': return (conn.status || 'Unverified').toLowerCase();
    }
  };

  const sortedConnections = React.useMemo(() => {
    if (activeSortIndex === undefined || activeSortDirection === undefined) return filtered;
    const key = sortableColumns[activeSortIndex];
    if (!key) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = getSortableValue(a, key);
      const bVal = getSortableValue(b, key);
      return activeSortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
  }, [filtered, activeSortIndex, activeSortDirection]);

  const getSortParams = (columnIndex: number): ThProps['sort'] => ({
    sortBy: {
      index: activeSortIndex,
      direction: activeSortDirection,
    },
    onSort: (_event, index, direction) => {
      setActiveSortIndex(index);
      setActiveSortDirection(direction);
    },
    columnIndex,
  });

  const MOCK_LINKED: Record<string, { assets: { name: string; context: string }[]; workloads: { name: string; context: string }[] }> = {
    'dataconnection-minio-underwriting': {
      assets: [
        { name: 'underwriting_guidelines', context: 'Data Registry' },
        { name: 'claims_documents', context: 'Data Registry' },
        { name: 'underwriting_embeddings', context: 'Vector Store' },
      ],
      workloads: [
        { name: 'fraud-detection-notebook', context: "Workbench in project 'underwriting'" },
        { name: 'eval-pipeline-job-42', context: 'EvalHub Deployment' },
      ],
    },
    'dataconnection-postgres-claims': {
      assets: [
        { name: 'claims_json_dataset', context: 'Data Registry' },
        { name: 'autorag_vector_store', context: 'Vector Store' },
      ],
      workloads: [
        { name: 'claims-processing-pipeline', context: "Workbench in project 'underwriting'" },
      ],
    },
    'dataconnection-snowflake-analytics': {
      assets: [
        { name: 'naic_rate_filings', context: 'Data Registry' },
      ],
      workloads: [],
    },
    'dataconnection-oci-quay-models': {
      assets: [],
      workloads: [
        { name: 'model-serving-runtime', context: "Model Server in project 'underwriting'" },
      ],
    },
    'dataconnection-kafka-events': {
      assets: [
        { name: 'claims_event_log', context: 'Data Registry' },
      ],
      workloads: [
        { name: 'streaming-ingest-job', context: "Pipeline in project 'underwriting'" },
      ],
    },
  };

  const linkedData = deleteTarget ? (MOCK_LINKED[deleteTarget] || { assets: [], workloads: [] }) : { assets: [], workloads: [] };
  const totalLinked = linkedData.assets.length + linkedData.workloads.length;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync({ namespace: project, name: deleteTarget });
    } finally {
      setDeleteTarget(null);
      setDeleteConfirm('');
      setDeleteLinkedExpanded(false);
    }
  };

  return (
    <PageSection>
      <Title headingLevel="h2" size="xl" style={{ marginBottom: 'var(--pf-t--global--spacer--md)' }}>
        Data connections
      </Title>
      <Toolbar clearAllFilters={() => { setSelectedTypes(allTypes); setFilterValue(''); }}>
        <ToolbarContent>
          <ToolbarGroup variant="filter-group">
            <ToolbarFilter
              labels={selectedTypes.length === allTypes.length ? [] : selectedTypes}
              deleteLabel={(_category, label) => setSelectedTypes((prev) => prev.filter((v) => v !== String(label)))}
              deleteLabelGroup={() => setSelectedTypes(allTypes)}
              categoryName="Type"
            >
              <Select
                role="menu"
                isOpen={isTypeFilterOpen}
                onSelect={(_event, value) => {
                  const val = String(value);
                  setSelectedTypes((prev) =>
                    prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val],
                  );
                }}
                onOpenChange={setIsTypeFilterOpen}
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    icon={<FilterIcon />}
                    onClick={() => setIsTypeFilterOpen(!isTypeFilterOpen)}
                    isExpanded={isTypeFilterOpen}
                  >
                    {selectedTypes.length === allTypes.length
                      ? 'Type'
                      : `Type: ${selectedTypes.length} selected`}
                  </MenuToggle>
                )}
              >
                <SelectList>
                  {allTypes.map((t) => (
                    <SelectOption key={t} hasCheckbox value={t} isSelected={selectedTypes.includes(t)}>{t}</SelectOption>
                  ))}
                </SelectList>
              </Select>
            </ToolbarFilter>
          </ToolbarGroup>
          <ToolbarItem>
            <SearchInput
              placeholder="Filter by name..."
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
        <Bullseye style={{ minHeight: 'var(--pf-t--global--spacer--4xl)' }}>
          <Spinner />
        </Bullseye>
      )}

      {!connectionsQuery.isLoading && sortedConnections.length === 0 && (
        connections.length > 0 ? (
          <EmptyState titleText="No results found" icon={SearchIcon}>
            <EmptyStateBody>Adjust your filters and try again.</EmptyStateBody>
            <EmptyStateFooter>
              <EmptyStateActions>
                <Button variant="link" onClick={() => { setSelectedTypes(allTypes); setFilterValue(''); }}>Clear all filters</Button>
              </EmptyStateActions>
            </EmptyStateFooter>
          </EmptyState>
        ) : (
          <EmptyState titleText="No Data Connections found" icon={() => null}>
            <EmptyStateBody>
              Create a Data Connection in your project to link storage credentials to catalog assets.
            </EmptyStateBody>
          </EmptyState>
        )
      )}

      {!connectionsQuery.isLoading && sortedConnections.length > 0 && (
        <Table aria-label="Connections table" variant="compact">
          <Thead>
            <Tr>
              <Th sort={getSortParams(0)}>Name</Th>
              <Th sort={getSortParams(1)}>Type</Th>
              <Th sort={getSortParams(2)}>Status</Th>
              <Th>Endpoint</Th>
              <Th>Bucket</Th>
              <Th />
            </Tr>
          </Thead>
          <Tbody>
            {sortedConnections.map((conn) => (
              <Tr key={`${conn.namespace}-${conn.name}`}>
                <Td dataLabel="Name">
                  <Link to={`/ai-hub/connections/${conn.name}?project=${project}`} style={{ fontWeight: 600 }}>
                    {conn.name}
                  </Link>
                  {conn.displayName && (
                    <div style={{ fontSize: 'var(--pf-t--global--font--size--sm)', color: 'var(--pf-t--global--text--color--subtle)' }}>
                      {conn.displayName}
                    </div>
                  )}
                </Td>
                <Td dataLabel="Type">{conn.connectionType}</Td>
                <Td dataLabel="Status"><ConnectionStatusLabel status={conn.status} lastTested={conn.lastTested} /></Td>
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
                      <DropdownItem key="test" onClick={() => { handleVerify(conn.name); setOpenKebab(null); }}>
                        Verify connection
                      </DropdownItem>
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
          variant={ModalVariant.medium}
          isOpen
          onClose={() => { setDeleteTarget(null); setDeleteConfirm(''); setDeleteLinkedExpanded(false); }}
          aria-label="Delete connection"
        >
          <ModalHeader title={`Permanently delete connection "${deleteTarget}"?`} titleIconVariant="warning" />
          <ModalBody>
            <p style={{ marginBottom: 'var(--pf-t--global--spacer--md)' }}>
              Deleting this connection will not delete the external data source
              {linkedData.assets.length > 0 && linkedData.workloads.length > 0
                ? `, but ${linkedData.assets.length} linked asset${linkedData.assets.length !== 1 ? 's' : ''} and ${linkedData.workloads.length} active workload${linkedData.workloads.length !== 1 ? 's' : ''} will lose access and stop working.`
                : linkedData.assets.length > 0
                  ? `, but ${linkedData.assets.length} linked asset${linkedData.assets.length !== 1 ? 's' : ''} will lose access.`
                  : linkedData.workloads.length > 0
                    ? `, but ${linkedData.workloads.length} active workload${linkedData.workloads.length !== 1 ? 's' : ''} will lose access and stop working.`
                    : '.'}
            </p>
            {totalLinked > 0 && (
              <ExpandableSection
                toggleText={`${deleteLinkedExpanded ? 'Hide' : 'Show'} ${totalLinked} linked asset${totalLinked !== 1 ? 's' : ''} and resources`}
                isExpanded={deleteLinkedExpanded}
                onToggle={(_e, expanded) => setDeleteLinkedExpanded(expanded)}
                style={{ marginBottom: 'var(--pf-t--global--spacer--md)' }}
              >
                <div style={{ paddingTop: 'var(--pf-t--global--spacer--sm)' }}>
                  {linkedData.assets.length > 0 && (
                    <>
                      <strong>Data assets ({linkedData.assets.length})</strong>
                      <List style={{ marginBottom: 'var(--pf-t--global--spacer--md)' }}>
                        {linkedData.assets.map((a) => (
                          <ListItem key={a.name}>{a.name} ({a.context})</ListItem>
                        ))}
                      </List>
                    </>
                  )}
                  {linkedData.workloads.length > 0 && (
                    <>
                      <strong>Workloads and workbenches ({linkedData.workloads.length})</strong>
                      <List>
                        {linkedData.workloads.map((w) => (
                          <ListItem key={w.name}>{w.name} ({w.context})</ListItem>
                        ))}
                      </List>
                    </>
                  )}
                </div>
              </ExpandableSection>
            )}
            <FormGroup label={<span>To confirm deletion, type <strong>{deleteTarget}</strong> below:</span>} isRequired fieldId="delete-conn-confirm">
              <TextInput id="delete-conn-confirm" value={deleteConfirm} onChange={(_e, v) => setDeleteConfirm(v)} placeholder={deleteTarget} />
            </FormGroup>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteMutation.isPending}
              isDisabled={deleteConfirm !== deleteTarget}
            >
              Delete connection
            </Button>
            <Button variant="link" onClick={() => { setDeleteTarget(null); setDeleteConfirm(''); setDeleteLinkedExpanded(false); }}>
              Cancel
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </PageSection>
  );
};

export default ConnectionsTab;
