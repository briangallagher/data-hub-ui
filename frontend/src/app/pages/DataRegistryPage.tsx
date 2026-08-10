import React from 'react';
import { useQueries } from '@tanstack/react-query';
import {
  PageSection,
  Title,
  Content,
  Tabs,
  Tab,
  TabTitleText,
  Spinner,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateActions,
  Label,
  SearchInput,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  ToolbarGroup,
  ToolbarFilter,
  Button,
  Bullseye,
  Flex,
  FlexItem,
  MenuToggle,
  Select,
  SelectOption,
  SelectList,
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  FormGroup,
  TextInput,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownList,
  LabelGroup,
  ExpandableSection,
  Breadcrumb,
  BreadcrumbItem,
  Card,
  CardBody,
  CardTitle,
  Grid,
  GridItem,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td, type ThProps } from '@patternfly/react-table';
import {
  EllipsisVIcon,
  PencilAltIcon,
  TrashIcon,
  FilterIcon,
  SearchIcon,
} from '@patternfly/react-icons';

const RhFolderIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ style, ...props }) => (
  <svg fill="currentColor" viewBox="0 0 36 36" aria-hidden="true" role="img" width="1em" height="1em" style={{ display: 'inline-block', verticalAlign: 'middle', ...style }} {...props}>
    <path d="M31 9.38h-3.71l-.52-2.47a.62.62 0 0 0-.61-.49h-7.32a.62.62 0 0 0-.61.49l-.52 2.47h-9.5a.62.62 0 0 0-.62.62v15a.63.63 0 0 0 1.25 0V10.62h9.37a.61.61 0 0 0 .61-.49l.53-2.46h6.3l.53 2.46a.61.61 0 0 0 .61.49h3.59v17.76H5.62V10a.62.62 0 0 0-1.24 0v19a.62.62 0 0 0 .62.62h26a.62.62 0 0 0 .62-.62V10a.62.62 0 0 0-.62-.62Z" />
  </svg>
);
import { useSearchParams, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  useK8sNamespaces,
  useCollections,
  fetchTablesAndVolumes,
  useTablesAndVolumes,
  useConnections,
  useCreateNamespace,
  useDeleteNamespace,
  useDeleteTable,
  useDeleteVolume,
  useTableDetail,
  useVolumeDetail,
  type CollectionInfo,
  type TableAsset,
  type DataConnection,
} from './useCatalogApi';
import RegisterDataModal from './RegisterDataModal';
import EditTableModal from './EditTableModal';
import EditVolumeModal from './EditVolumeModal';
import useUser from '~/app/hooks/useUser';

const FORMAT_COLORS: Record<string, 'orange' | 'blue' | 'green' | 'grey' | 'teal' | 'purple'> = {
  iceberg: 'orange',
  parquet: 'blue',
  delta: 'green',
  csv: 'grey',
  postgresql: 'teal',
  mysql: 'teal',
  snowflake: 'purple',
  mssql: 'teal',
  mongodb: 'green',
};

const DataRegistryPage: React.FC = () => {
  const location = useLocation();
  const pathPrefix = '/ai-hub/data/';
  const subPath = location.pathname.startsWith(pathPrefix) ? location.pathname.slice(pathPrefix.length) : '';
  const assetDetailMatch = subPath.match(/^collections\/([^/]+)\/([^/]+)$/);
  const collectionDetailMatch = subPath.match(/^collections\/([^/]+)$/);
  const detailNamespace = assetDetailMatch?.[1];
  const detailAssetName = assetDetailMatch?.[2];
  const detailCollectionName = collectionDetailMatch?.[1];
  const isDetailView = !!(detailNamespace && detailAssetName);
  const isCollectionDetailView = !!detailCollectionName;
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = searchParams.get('tab') || 'assets';
  const selectedProject = searchParams.get('project') || '';
  const isVolume = searchParams.get('type') === 'volume';

  const [isProjectOpen, setIsProjectOpen] = React.useState(false);
  const [projectFilter, setProjectFilter] = React.useState('');
  const [selectedCollections, setSelectedCollections] = React.useState<string[]>([]);
  const [selectedAssetTypes, setSelectedAssetTypes] = React.useState<string[]>(['Tables', 'Volumes']);
  const [selectedFormats, setSelectedFormats] = React.useState<string[]>([]);
  const [activeAttribute, setActiveAttribute] = React.useState<'Collections' | 'Asset type' | 'Format'>('Collections');
  const [isAttributeOpen, setIsAttributeOpen] = React.useState(false);
  const [isValueOpen, setIsValueOpen] = React.useState(false);
  const [nameFilter, setNameFilter] = React.useState('');

  const [showCreateCollection, setShowCreateCollection] = React.useState(false);
  const [newCollectionName, setNewCollectionName] = React.useState('');
  const [showRegister, setShowRegister] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<{ name: string; namespace: string; isVolume: boolean } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = React.useState('');
  const [editTarget, setEditTarget] = React.useState<TableAsset | null>(null);
  const [openKebab, setOpenKebab] = React.useState<string | null>(null);
  const [activeSortIndex, setActiveSortIndex] = React.useState<number | undefined>(undefined);
  const [activeSortDirection, setActiveSortDirection] = React.useState<'asc' | 'desc' | undefined>(undefined);
  const namespacesQuery = useK8sNamespaces();
  const allNamespaces = namespacesQuery.data || [];
  const HIDDEN_NS = ['openshift', 'default', 'system', 'redhat-ods-applications'];
  const projects = React.useMemo(() =>
    allNamespaces.filter((ns) =>
      !ns.name.startsWith('openshift-') &&
      !ns.name.startsWith('kube-') &&
      !HIDDEN_NS.includes(ns.name)
    ),
    [allNamespaces],
  );

  const collectionsQuery = useCollections(selectedProject);
  const collections: CollectionInfo[] = collectionsQuery.data || [];

  const connectionsQuery = useConnections(selectedProject);
  const connections: DataConnection[] = connectionsQuery.data || [];

  const tableDetailQuery = useTableDetail(selectedProject, detailNamespace || '', isDetailView && !isVolume ? detailAssetName || '' : '');
  const volumeDetailQuery = useVolumeDetail(selectedProject, detailNamespace || '', isDetailView && isVolume ? detailAssetName || '' : '');
  const detailQuery = isVolume ? volumeDetailQuery : tableDetailQuery;

  const createNamespace = useCreateNamespace();
  const deleteNamespace = useDeleteNamespace();
  const deleteTable = useDeleteTable();
  const deleteVolume = useDeleteVolume();

  const allCollectionNames = React.useMemo(() => collections.map((c) => c.name), [collections]);
  const isAllSources = selectedCollections.length === 0 ||
    (collections.length > 0 && selectedCollections.length === collections.length &&
      allCollectionNames.every((n) => selectedCollections.includes(n)));

  React.useEffect(() => {
    if (collections.length > 0 && selectedCollections.length === 0) {
      setSelectedCollections(allCollectionNames);
    }
  }, [collections, allCollectionNames, selectedCollections.length]);

  const collectionsToFetch = React.useMemo(() => {
    if (selectedCollections.length > 0) return selectedCollections;
    return allCollectionNames;
  }, [selectedCollections, allCollectionNames]);

  const allAssets = useMultiCollectionAssets(selectedProject, collectionsToFetch);

  const allFormats = React.useMemo(() => {
    const formats = new Set<string>();
    allAssets.forEach((a) => {
      if (a.isVolume) {
        formats.add('Unstructured');
      } else if (a.format) {
        formats.add(a.format.charAt(0).toUpperCase() + a.format.slice(1).toLowerCase());
      }
    });
    return Array.from(formats).sort();
  }, [allAssets]);

  React.useEffect(() => {
    if (allFormats.length > 0 && selectedFormats.length === 0) {
      setSelectedFormats(allFormats);
    }
  }, [allFormats, selectedFormats.length]);

  const onAssetTypeSelect = (_event: React.MouseEvent | undefined, value: string | number | undefined) => {
    const val = String(value);
    setSelectedAssetTypes((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val],
    );
  };

  const onFormatSelect = (_event: React.MouseEvent | undefined, value: string | number | undefined) => {
    const val = String(value);
    setSelectedFormats((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val],
    );
  };

  const onDeleteAssetTypeLabel = (_category: string, label: string) => {
    setSelectedAssetTypes((prev) => prev.filter((v) => v !== label));
  };

  const onDeleteAssetTypeLabelGroup = () => {
    setSelectedAssetTypes([]);
  };

  const onDeleteFormatLabel = (_category: string, label: string) => {
    setSelectedFormats((prev) => prev.filter((v) => v !== label));
  };

  const onDeleteFormatLabelGroup = () => {
    setSelectedFormats([]);
  };

  const filteredAssets = React.useMemo(() => {
    let result = allAssets;
    if (selectedAssetTypes.length > 0) {
      result = result.filter((a) => {
        const type = a.isVolume ? 'Volumes' : 'Tables';
        return selectedAssetTypes.includes(type);
      });
    }
    if (selectedFormats.length > 0) {
      result = result.filter((a) => {
        const f = a.isVolume ? 'Unstructured' : (a.format ? a.format.charAt(0).toUpperCase() + a.format.slice(1).toLowerCase() : '');
        return selectedFormats.includes(f);
      });
    }
    if (nameFilter) {
      const q = nameFilter.toLowerCase();
      result = result.filter(
        (a) => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q),
      );
    }
    return result;
  }, [allAssets, nameFilter, selectedAssetTypes, selectedFormats]);

  const sortableColumns = ['name', 'namespace', 'assetType', 'format'] as const;
  const getSortableValue = (asset: TableAsset, key: typeof sortableColumns[number]): string => {
    switch (key) {
      case 'name': return asset.name.toLowerCase();
      case 'namespace': return asset.namespace.toLowerCase();
      case 'assetType': return asset.isVolume ? 'volume' : 'table';
      case 'format': return asset.isVolume ? 'unstructured' : (asset.format || '').toLowerCase();
    }
  };

  const sortedAssets = React.useMemo(() => {
    if (activeSortIndex === undefined || activeSortDirection === undefined) return filteredAssets;
    const key = sortableColumns[activeSortIndex];
    if (!key) return filteredAssets;
    return [...filteredAssets].sort((a, b) => {
      const aVal = getSortableValue(a, key);
      const bVal = getSortableValue(b, key);
      return activeSortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
  }, [filteredAssets, activeSortIndex, activeSortDirection]);

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

  const handleTabSelect = (_: React.MouseEvent, tabKey: string | number) => {
    const params = new URLSearchParams();
    params.set('tab', String(tabKey));
    if (selectedProject) params.set('project', selectedProject);
    navigate(`/ai-hub/data/collections?${params.toString()}`);
  };

  const handleProjectChange = (_event: React.MouseEvent | undefined, value: string | number | undefined) => {
    const params: Record<string, string> = { tab: activeTab };
    if (value && value !== '__none__') params.project = String(value);
    setSearchParams(params);
    setIsProjectOpen(false);
    setProjectFilter('');
    setSelectedCollections([]);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.isVolume) {
        await deleteVolume.mutateAsync({ project: selectedProject, namespace: deleteTarget.namespace, name: deleteTarget.name });
      } else {
        await deleteTable.mutateAsync({ project: selectedProject, namespace: deleteTarget.namespace, name: deleteTarget.name });
      }
    } finally {
      setDeleteTarget(null);
    }
  };

  const filteredProjects = React.useMemo(() => {
    if (!projectFilter) return projects;
    const q = projectFilter.toLowerCase();
    return projects.filter((ns) => ns.name.toLowerCase().includes(q));
  }, [projects, projectFilter]);

  React.useEffect(() => {
    if (!selectedProject && projects.length > 0) {
      const params: Record<string, string> = { tab: activeTab, project: projects[0].name };
      setSearchParams(params);
    }
  }, [projects, selectedProject, activeTab, setSearchParams]);

  const isLoading = namespacesQuery.isLoading || (selectedProject && collectionsQuery.isLoading);
  const registerNamespace = selectedCollections.length === 1
    ? selectedCollections[0]
    : 'default';

  return (
    <>
      <PageSection>
        <Flex alignItems={{ default: 'alignItemsFlexStart' }} spaceItems={{ default: 'spaceItemsMd' }}>
          <FlexItem style={{ paddingTop: 'var(--pf-t--global--spacer--xs)' }}>
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="20" fill="#ECE6FF"/>
              <path d="M28 25.6712C27.5555 25.6712 27.1466 25.8045 26.8 26.0179L22.64 21.8579C23.0044 21.3334 23.2266 20.7023 23.2266 20.009C23.2266 19.9734 23.2177 19.929 23.2177 19.8934L25.0489 19.5023C25.5466 20.649 26.6844 21.449 28.0089 21.449C29.7866 21.449 31.2266 20.0001 31.2266 18.2312C31.2266 16.4623 29.7777 15.0134 28.0089 15.0134C26.24 15.0134 24.7911 16.4623 24.7911 18.2312C24.7911 18.2934 24.8089 18.3557 24.8089 18.4179L22.9955 18.8001C22.6577 17.9557 21.9644 17.2979 21.1111 16.9868L21.8666 13.4401C23.12 13.4045 24.1244 12.3734 24.1244 11.1112C24.1244 9.84899 23.0755 8.78233 21.7955 8.78233C20.5155 8.78233 19.4666 9.83122 19.4666 11.1112C19.4666 12.0357 20.0089 12.8268 20.7911 13.2001L20.0355 16.7734C19.3511 16.7734 18.7111 16.9957 18.1866 17.3601L14.6666 13.8401C15.0311 13.3157 15.2533 12.6845 15.2533 11.9912C15.2533 10.2134 13.8044 8.77344 12.0355 8.77344C10.2666 8.77344 8.81775 10.2223 8.81775 11.9912C8.81775 13.7601 10.2666 15.209 12.0355 15.209C12.72 15.209 13.36 14.9868 13.8844 14.6223L17.4044 18.1423C17.04 18.6668 16.8177 19.2979 16.8177 19.9912C16.8177 20.0268 16.8266 20.0712 16.8266 20.1068L14.0889 20.6845C13.6977 19.9468 12.9244 19.4312 12.0355 19.4312C10.7466 19.4312 9.70664 20.4801 9.70664 21.7601C9.70664 23.0401 10.7555 24.089 12.0355 24.089C13.3155 24.089 14.3644 23.0401 14.3644 21.7601L17.0489 21.1823C17.36 21.9557 17.9644 22.5779 18.7289 22.9245L18.3377 24.7734C18.3377 24.7734 18.2844 24.7734 18.2577 24.7734C16.48 24.7734 15.04 26.2223 15.04 27.9912C15.04 29.7601 16.4889 31.209 18.2577 31.209C20.0266 31.209 21.4755 29.7601 21.4755 27.9912C21.4755 26.6312 20.6222 25.4668 19.4222 24.9957L19.8044 23.1912C19.8755 23.1912 19.9555 23.2179 20.0266 23.2179C20.7111 23.2179 21.3511 22.9957 21.8755 22.6312L26.0355 26.7912C25.8222 27.1468 25.6889 27.5557 25.6889 27.9912C25.6889 29.2801 26.7377 30.3201 28.0177 30.3201C29.2977 30.3201 30.3466 29.2712 30.3466 27.9912C30.3466 26.7112 29.2977 25.6623 28.0177 25.6623L28 25.6712ZM28 16.1157C29.1644 16.1157 30.1155 17.0668 30.1155 18.2312C30.1155 19.3957 29.1644 20.3468 28 20.3468C26.8355 20.3468 25.8844 19.3957 25.8844 18.2312C25.8844 17.0668 26.8355 16.1157 28 16.1157ZM20.5511 11.1201C20.5511 10.4445 21.1022 9.89344 21.7777 9.89344C22.4533 9.89344 23.0044 10.4445 23.0044 11.1201C23.0044 11.7957 22.4533 12.3468 21.7777 12.3468C21.1022 12.3468 20.5511 11.7957 20.5511 11.1201ZM12 14.1245C10.8355 14.1245 9.88442 13.1734 9.88442 12.009C9.88442 10.8445 10.8355 9.89344 12 9.89344C13.1644 9.89344 14.1155 10.8445 14.1155 12.009C14.1155 13.1734 13.1644 14.1245 12 14.1245ZM12 23.0134C11.3244 23.0134 10.7733 22.4623 10.7733 21.7868C10.7733 21.1112 11.3244 20.5601 12 20.5601C12.6755 20.5601 13.2266 21.1112 13.2266 21.7868C13.2266 22.4623 12.6755 23.0134 12 23.0134ZM20.3377 28.009C20.3377 29.1734 19.3866 30.1245 18.2222 30.1245C17.0577 30.1245 16.1066 29.1734 16.1066 28.009C16.1066 26.8445 17.0577 25.8934 18.2222 25.8934C19.3866 25.8934 20.3377 26.8445 20.3377 28.009ZM17.8933 20.009C17.8933 18.8445 18.8444 17.8934 20.0089 17.8934C21.1733 17.8934 22.1244 18.8445 22.1244 20.009C22.1244 21.1734 21.1733 22.1245 20.0089 22.1245C18.8444 22.1245 17.8933 21.1734 17.8933 20.009ZM28.0089 29.2357C27.3333 29.2357 26.7822 28.6845 26.7822 28.009C26.7822 27.3334 27.3333 26.7823 28.0089 26.7823C28.6844 26.7823 29.2355 27.3334 29.2355 28.009C29.2355 28.6845 28.6844 29.2357 28.0089 29.2357Z" fill="#151515"/>
            </svg>
          </FlexItem>
          <FlexItem>
            <Title headingLevel="h1" size="2xl">Data assets</Title>
            <Content component="p" style={{ color: 'var(--pf-t--global--text--color--subtle)', marginTop: 'var(--pf-t--global--spacer--xs)' }}>
              Discover, manage, and connect enterprise data resources for your project. Browse curated catalogs, view registered schemas and datasets, or manage namespace-scoped data connections.
            </Content>
          </FlexItem>
        </Flex>
      </PageSection>

      <PageSection padding={{ default: 'noPadding' }}>
        <Toolbar style={{ paddingLeft: 'var(--pf-t--global--spacer--lg)', paddingRight: 'var(--pf-t--global--spacer--lg)', paddingTop: 'var(--pf-t--global--spacer--sm)' }}>
          <ToolbarContent>
            <ToolbarItem>
              <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsMd' }}>
                <FlexItem>
                  <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                    <FlexItem><RhFolderIcon style={{ fontSize: 'var(--pf-t--global--font--size--lg)', verticalAlign: 'middle' }} /></FlexItem>
                    <FlexItem>Project</FlexItem>
                  </Flex>
                </FlexItem>
                <FlexItem>
                  <Select
                    isOpen={isProjectOpen}
                    selected={selectedProject || '__none__'}
                    onSelect={handleProjectChange}
                    onOpenChange={(open) => { setIsProjectOpen(open); if (!open) setProjectFilter(''); }}
                    toggle={(toggleRef) => (
                      <MenuToggle
                        ref={toggleRef}
                        onClick={() => setIsProjectOpen(!isProjectOpen)}
                        isExpanded={isProjectOpen}
                        style={{ minWidth: 'var(--pf-t--global--spacer--4xl)' }}
                      >
                        {selectedProject || 'Select a project'}
                      </MenuToggle>
                    )}
                  >
                    <div style={{ padding: 'var(--pf-t--global--spacer--sm)' }}>
                      <SearchInput
                        placeholder="Filter registries"
                        value={projectFilter}
                        onChange={(_e, v) => setProjectFilter(v)}
                        onClear={() => setProjectFilter('')}
                      />
                    </div>
                    <Divider />
                    <SelectList>
                      {filteredProjects.map((p) => (
                        <SelectOption key={p.name} value={p.name}>{p.name}</SelectOption>
                      ))}
                    </SelectList>
                  </Select>
                </FlexItem>
                {selectedProject && (
                  <FlexItem>
                    <Button variant="link" component={(props) => <Link {...props} to={`/ai-hub/data/collections?project=${selectedProject}&tab=assets`} />}>
                      Go to <RhFolderIcon style={{ fontSize: 'var(--pf-t--global--font--size--lg)', marginLeft: 'var(--pf-t--global--spacer--xs)', marginRight: 'var(--pf-t--global--spacer--xs)', verticalAlign: 'middle' }} />{' '}<strong>{selectedProject}</strong>
                    </Button>
                  </FlexItem>
                )}
              </Flex>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>

        <Tabs activeKey={activeTab} onSelect={handleTabSelect} style={{ paddingLeft: 'var(--pf-t--global--spacer--md)' }}>
          <Tab eventKey="assets" title={<TabTitleText>Registry</TabTitleText>}>
            {isDetailView ? (
              <AssetDetailContent
                project={selectedProject}
                namespace={detailNamespace!}
                assetName={detailAssetName!}
                isVolume={isVolume}
                detailQuery={detailQuery}
                onEdit={() => {
                  const asset = detailQuery.data;
                  if (asset) {
                    setEditTarget({
                      name: detailAssetName!,
                      namespace: detailNamespace!,
                      description: asset.description || '',
                      format: asset.format || '',
                      location: asset.location || '',
                      connectionRef: asset.connection_ref || '',
                      isVolume,
                      properties: asset.properties || {},
                    } as TableAsset);
                  }
                }}
                onDelete={() => setDeleteTarget({ name: detailAssetName!, namespace: detailNamespace!, isVolume })}
              />
            ) : isCollectionDetailView ? (
              <CollectionDetailContent
                project={selectedProject}
                collectionName={detailCollectionName!}
                collections={collections}
                onDeleteCollection={() => {
                  deleteNamespace.mutateAsync({ project: selectedProject, name: detailCollectionName! }).then(() => {
                    navigate(`/ai-hub/data/collections?project=${selectedProject}&tab=assets`);
                  });
                }}
              />
            ) : !selectedProject ? (
              <PageSection>
                <EmptyState titleText="Select a project" icon={() => null}>
                  <EmptyStateBody>Choose a project from the dropdown above to view assets.</EmptyStateBody>
                </EmptyState>
              </PageSection>
            ) : (
              <PageSection>
                <Toolbar clearAllFilters={() => { setSelectedCollections(allCollectionNames); setSelectedAssetTypes(['Tables', 'Volumes']); setSelectedFormats(allFormats); }}>
                  <ToolbarContent>
                    <ToolbarGroup variant="filter-group">
                      <ToolbarItem>
                        <Select
                          isOpen={isAttributeOpen}
                          selected={activeAttribute}
                          onSelect={(_event, value) => {
                            setActiveAttribute(value as typeof activeAttribute);
                            setIsAttributeOpen(false);
                          }}
                          onOpenChange={setIsAttributeOpen}
                          toggle={(toggleRef) => (
                            <MenuToggle
                              ref={toggleRef}
                              icon={<FilterIcon />}
                              onClick={() => setIsAttributeOpen(!isAttributeOpen)}
                              isExpanded={isAttributeOpen}
                            >
                              {activeAttribute}
                            </MenuToggle>
                          )}
                        >
                          <SelectList>
                            <SelectOption value="Collections">Collections</SelectOption>
                            <SelectOption value="Asset type">Asset type</SelectOption>
                            <SelectOption value="Format">Format</SelectOption>
                          </SelectList>
                        </Select>
                      </ToolbarItem>
                      <ToolbarFilter
                        labels={selectedCollections.length === allCollectionNames.length ? [] : selectedCollections}
                        deleteLabel={(_category, label) => setSelectedCollections((prev) => prev.filter((v) => v !== String(label)))}
                        deleteLabelGroup={() => setSelectedCollections(allCollectionNames)}
                        categoryName="Collections"
                        showToolbarItem={activeAttribute === 'Collections'}
                      >
                        <Select
                          role="menu"
                          isOpen={isValueOpen && activeAttribute === 'Collections'}
                          onSelect={(_event, value) => {
                            const val = String(value);
                            setSelectedCollections((prev) =>
                              prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val],
                            );
                          }}
                          onOpenChange={(open) => setIsValueOpen(open)}
                          toggle={(toggleRef) => (
                            <MenuToggle
                              ref={toggleRef}
                              onClick={() => setIsValueOpen(!isValueOpen)}
                              isExpanded={isValueOpen && activeAttribute === 'Collections'}
                            >
                              {selectedCollections.length === allCollectionNames.length
                                ? 'All collections'
                                : `${selectedCollections.length} selected`}
                            </MenuToggle>
                          )}
                        >
                          <SelectList>
                            {collections.map((c) => (
                              <SelectOption key={c.name} hasCheckbox value={c.name} isSelected={selectedCollections.includes(c.name)}>{c.name}</SelectOption>
                            ))}
                          </SelectList>
                        </Select>
                      </ToolbarFilter>
                      <ToolbarFilter
                        labels={selectedAssetTypes.length === 2 ? [] : selectedAssetTypes}
                        deleteLabel={(_category, label) => onDeleteAssetTypeLabel('Asset type', String(label))}
                        deleteLabelGroup={() => setSelectedAssetTypes(['Tables', 'Volumes'])}
                        categoryName="Asset type"
                        showToolbarItem={activeAttribute === 'Asset type'}
                      >
                        <Select
                          role="menu"
                          isOpen={isValueOpen && activeAttribute === 'Asset type'}
                          onSelect={onAssetTypeSelect}
                          onOpenChange={(open) => setIsValueOpen(open)}
                          toggle={(toggleRef) => (
                            <MenuToggle
                              ref={toggleRef}
                              onClick={() => setIsValueOpen(!isValueOpen)}
                              isExpanded={isValueOpen && activeAttribute === 'Asset type'}
                            >
                              {selectedAssetTypes.length === 2
                                ? 'All asset types'
                                : `${selectedAssetTypes.length} selected`}
                            </MenuToggle>
                          )}
                        >
                          <SelectList>
                            <SelectOption hasCheckbox value="Tables" isSelected={selectedAssetTypes.includes('Tables')}>Tables</SelectOption>
                            <SelectOption hasCheckbox value="Volumes" isSelected={selectedAssetTypes.includes('Volumes')}>Volumes</SelectOption>
                          </SelectList>
                        </Select>
                      </ToolbarFilter>
                      <ToolbarFilter
                        labels={selectedFormats.length === allFormats.length ? [] : selectedFormats}
                        deleteLabel={(_category, label) => onDeleteFormatLabel('Format', String(label))}
                        deleteLabelGroup={() => setSelectedFormats(allFormats)}
                        categoryName="Format"
                        showToolbarItem={activeAttribute === 'Format'}
                      >
                        <Select
                          role="menu"
                          isOpen={isValueOpen && activeAttribute === 'Format'}
                          onSelect={onFormatSelect}
                          onOpenChange={(open) => setIsValueOpen(open)}
                          toggle={(toggleRef) => (
                            <MenuToggle
                              ref={toggleRef}
                              onClick={() => setIsValueOpen(!isValueOpen)}
                              isExpanded={isValueOpen && activeAttribute === 'Format'}
                            >
                              {selectedFormats.length === allFormats.length
                                ? 'All formats'
                                : `${selectedFormats.length} selected`}
                            </MenuToggle>
                          )}
                        >
                          <SelectList>
                            {allFormats.map((f) => (
                              <SelectOption key={f} hasCheckbox value={f} isSelected={selectedFormats.includes(f)}>{f}</SelectOption>
                            ))}
                          </SelectList>
                        </Select>
                      </ToolbarFilter>
                    </ToolbarGroup>
                    <ToolbarItem>
                      <SearchInput
                        placeholder="Filter by name, description, or keywords"
                        value={nameFilter}
                        onChange={(_e, v) => setNameFilter(v)}
                        onClear={() => setNameFilter('')}
                      />
                    </ToolbarItem>
                    <ToolbarGroup variant="action-group">
                      <ToolbarItem>
                        <Button variant="primary" onClick={() => setShowRegister(true)}>
                          Register data
                        </Button>
                      </ToolbarItem>
                      <ToolbarItem>
                        <Button variant="secondary" onClick={() => setShowCreateCollection(true)}>
                          Create collection
                        </Button>
                      </ToolbarItem>
                    </ToolbarGroup>
                  </ToolbarContent>
                </Toolbar>

                {isLoading ? (
                  <Bullseye style={{ minHeight: 'var(--pf-t--global--spacer--4xl)' }}><Spinner /></Bullseye>
                ) : filteredAssets.length === 0 && (nameFilter || selectedAssetTypes.length < 2 || selectedFormats.length < allFormats.length || selectedCollections.length < allCollectionNames.length) ? (
                  <EmptyState titleText="No results found" icon={SearchIcon}>
                    <EmptyStateBody>
                      No results match the current filters. Adjust your filters and try again.
                    </EmptyStateBody>
                    <EmptyStateFooter>
                      <EmptyStateActions>
                        <Button variant="link" onClick={() => { setNameFilter(''); setSelectedCollections(allCollectionNames); setSelectedAssetTypes(['Tables', 'Volumes']); setSelectedFormats(allFormats); }}>
                          Clear all filters
                        </Button>
                      </EmptyStateActions>
                    </EmptyStateFooter>
                  </EmptyState>
                ) : filteredAssets.length === 0 ? (
                  <EmptyState titleText="No data assets" icon={() => null}>
                    <EmptyStateBody>
                      Register tables or volumes to get started.
                    </EmptyStateBody>
                  </EmptyState>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                  <Table aria-label="Data assets" variant="compact">
                    <Thead>
                      <Tr>
                        <Th sort={getSortParams(0)}>Name</Th>
                        <Th sort={getSortParams(1)}>Collection</Th>
                        <Th sort={getSortParams(2)}>Asset type</Th>
                        <Th sort={getSortParams(3)}>Format</Th>
                        <Th>Asset location</Th>
                        <Th>Properties</Th>
                        <Th>Labels</Th>
                        <Th isStickyColumn stickyMinWidth="50px" stickyRightOffset="0" />
                      </Tr>
                    </Thead>
                    <Tbody>
                      {sortedAssets.map((asset) => {
                        const rowKey = `${asset.namespace}-${asset.name}-${asset.isVolume ? 'v' : 't'}`;
                        const detailUrl = `/ai-hub/data/collections/${asset.namespace}/${asset.name}?project=${selectedProject}${asset.isVolume ? '&type=volume' : ''}`;
                        const PROPERTY_KEYS = ['pii', 'purpose', 'maturity', 'domain', 'license'];
                        const props = asset.properties || {};
                        const propertyEntries = Object.entries(props).filter(([k]) => PROPERTY_KEYS.includes(k.toLowerCase()));
                        const labelEntries = Object.entries(props).filter(([k]) => !PROPERTY_KEYS.includes(k.toLowerCase()));
                        return (
                          <Tr key={rowKey}>
                            <Td dataLabel="Name">
                              <div>
                                <Link to={detailUrl} style={{ fontWeight: 600 }}>{asset.name}</Link>
                              </div>
                              {asset.description && (
                                <div style={{ fontSize: 'var(--pf-t--global--font--size--sm)', color: 'var(--pf-t--global--text--color--subtle)', marginTop: 'var(--pf-t--global--spacer--xs)' }}>
                                  {asset.description.length > 80 ? `${asset.description.substring(0, 80)}...` : asset.description}
                                </div>
                              )}
                            </Td>
                            <Td dataLabel="Collection">
                              <Link to={`/ai-hub/data/collections/${asset.namespace}?project=${selectedProject}`}>
                                {asset.namespace}
                              </Link>
                            </Td>
                            <Td dataLabel="Asset type">
                              {asset.isVolume ? 'Volume' : 'Table'}
                            </Td>
                            <Td dataLabel="Format">
                              {asset.isVolume ? (
                                <Label isCompact variant="outline" color="grey">Unstructured</Label>
                              ) : asset.format ? (
                                <Label isCompact variant="outline" color={FORMAT_COLORS[asset.format] || 'grey'}>
                                  {asset.format}
                                </Label>
                              ) : '—'}
                            </Td>
                            <Td dataLabel="Asset location">
                              {asset.connectionRef ? (
                                <Link to={`/ai-hub/connections/${asset.connectionRef}?project=${selectedProject}`}>
                                  {asset.connectionRef}
                                </Link>
                              ) : asset.location ? (
                                <span style={{ fontSize: 'var(--pf-t--global--font--size--sm)' }}>
                                  {asset.location.length > 40 ? `${asset.location.substring(0, 40)}...` : asset.location}
                                </span>
                              ) : '—'}
                            </Td>
                            <Td dataLabel="Properties">
                              {propertyEntries.length > 0 ? (
                                <LabelGroup numLabels={3} isCompact>
                                  {propertyEntries.map(([k, v]) => (
                                    <Label key={k} isCompact variant="outline">{k}: {v}</Label>
                                  ))}
                                </LabelGroup>
                              ) : '—'}
                            </Td>
                            <Td dataLabel="Labels">
                              {labelEntries.length > 0 ? (
                                <LabelGroup numLabels={3} isCompact>
                                  {labelEntries.map(([k, v]) => (
                                    <Label key={k} isCompact variant="outline">{k}: {v}</Label>
                                  ))}
                                </LabelGroup>
                              ) : '—'}
                            </Td>
                            <Td dataLabel="Actions" isActionCell isStickyColumn stickyMinWidth="50px" stickyRightOffset="0">
                              <Dropdown
                                isOpen={openKebab === rowKey}
                                onOpenChange={(open) => setOpenKebab(open ? rowKey : null)}
                                toggle={(toggleRef) => (
                                  <MenuToggle
                                    ref={toggleRef}
                                    variant="plain"
                                    onClick={() => setOpenKebab(openKebab === rowKey ? null : rowKey)}
                                    isExpanded={openKebab === rowKey}
                                  >
                                    <EllipsisVIcon />
                                  </MenuToggle>
                                )}
                                popperProps={{ position: 'right' }}
                              >
                                <DropdownList>
                                  <DropdownItem key="edit" onClick={() => { setEditTarget(asset); setOpenKebab(null); }}>
                                    Edit
                                  </DropdownItem>
                                  <DropdownItem key="delete" onClick={() => {
                                    setDeleteTarget({ name: asset.name, namespace: asset.namespace, isVolume: asset.isVolume });
                                    setOpenKebab(null);
                                  }}>
                                    Delete
                                  </DropdownItem>
                                  <DropdownItem key="provenance" isDisabled>
                                    View provenance
                                  </DropdownItem>
                                </DropdownList>
                              </Dropdown>
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                  </div>
                )}
              </PageSection>
            )}
          </Tab>
        </Tabs>
      </PageSection>

      {/* Create collection modal */}
      {showCreateCollection && (
        <Modal variant={ModalVariant.medium} isOpen onClose={() => { setShowCreateCollection(false); setNewCollectionName(''); }} aria-label="Create collection">
          <ModalHeader title="Create collection" />
          <ModalBody>
            <Form>
              <FormGroup label="Name" isRequired fieldId="collection-name">
                <TextInput id="collection-name" value={newCollectionName} onChange={(_e, v) => setNewCollectionName(v)} isRequired placeholder="e.g. underwriting" />
              </FormGroup>
            </Form>
          </ModalBody>
          <ModalFooter>
            <Button variant="primary" isDisabled={!newCollectionName.trim() || createNamespace.isPending} isLoading={createNamespace.isPending}
              onClick={async () => {
                await createNamespace.mutateAsync({ project: selectedProject, name: newCollectionName.trim() });
                setShowCreateCollection(false);
                setNewCollectionName('');
              }}
            >
              Create
            </Button>
            <Button variant="link" onClick={() => { setShowCreateCollection(false); setNewCollectionName(''); }}>Cancel</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Delete asset modal */}
      {deleteTarget && (
        <Modal variant={ModalVariant.medium} isOpen onClose={() => { setDeleteTarget(null); setDeleteConfirm(''); }} aria-label="Delete asset">
          <ModalHeader title={`Permanently delete "${deleteTarget.name}" ${deleteTarget.isVolume ? 'volume' : 'table'}?`} titleIconVariant="warning" />
          <ModalBody>
            <p style={{ marginBottom: 'var(--pf-t--global--spacer--md)' }}><strong>{deleteTarget.name}</strong> and its data will be lost forever.</p>
            <FormGroup label={<span>To confirm deletion, type <strong>{deleteTarget.name}</strong> below:</span>} isRequired fieldId="delete-confirm">
              <TextInput id="delete-confirm" value={deleteConfirm} onChange={(_e, v) => setDeleteConfirm(v)} placeholder={deleteTarget.name} />
            </FormGroup>
          </ModalBody>
          <ModalFooter>
            <Button variant="danger" onClick={handleDelete} isLoading={deleteTable.isPending || deleteVolume.isPending} isDisabled={deleteConfirm !== deleteTarget.name}>Delete</Button>
            <Button variant="link" onClick={() => { setDeleteTarget(null); setDeleteConfirm(''); }}>Cancel</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Register modal */}
      {showRegister && (
        <RegisterDataModal project={selectedProject} namespace={registerNamespace} connections={connections} collectionNames={allCollectionNames} onClose={() => setShowRegister(false)} />
      )}

      {/* Edit modals */}
      {editTarget && !editTarget.isVolume && (
        <EditTableModal
          project={selectedProject}
          namespace={editTarget.namespace}
          name={editTarget.name}
          currentDescription={editTarget.description}
          currentProperties={editTarget.properties}
          onClose={() => setEditTarget(null)}
        />
      )}
      {editTarget && editTarget.isVolume && (
        <EditVolumeModal
          project={selectedProject}
          namespace={editTarget.namespace}
          name={editTarget.name}
          currentDescription={editTarget.description}
          currentLocation={editTarget.location}
          currentProperties={editTarget.properties}
          onClose={() => setEditTarget(null)}
        />
      )}
    </>
  );
};

const AssetDetailContent: React.FC<{
  project: string;
  namespace: string;
  assetName: string;
  isVolume: boolean;
  detailQuery: ReturnType<typeof useTableDetail>;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ project, namespace, assetName, isVolume, detailQuery, onEdit, onDelete }) => {
  const { userId } = useUser();
  const [detailKebabOpen, setDetailKebabOpen] = React.useState(false);
  const [propsExpanded, setPropsExpanded] = React.useState(false);
  const [labelsExpanded, setLabelsExpanded] = React.useState(false);
  const propsRef = React.useRef<HTMLDivElement>(null);
  const labelsRef = React.useRef<HTMLDivElement>(null);
  const [propsOverflows, setPropsOverflows] = React.useState(false);
  const [labelsOverflows, setLabelsOverflows] = React.useState(false);
  const LABEL_ROW_HEIGHT = 28;
  const MAX_ROWS = 3;
  const collapsedHeight = LABEL_ROW_HEIGHT * MAX_ROWS;
  const asset = detailQuery.data;

  React.useEffect(() => {
    if (propsRef.current) {
      setPropsOverflows(propsRef.current.scrollHeight > collapsedHeight + 4);
    }
    if (labelsRef.current) {
      setLabelsOverflows(labelsRef.current.scrollHeight > collapsedHeight + 4);
    }
  });

  if (detailQuery.isLoading) {
    return (
      <PageSection>
        <Bullseye style={{ minHeight: 'var(--pf-t--global--spacer--6xl)' }}><Spinner /></Bullseye>
      </PageSection>
    );
  }

  if (!asset) {
    return (
      <PageSection>
        <Content>Asset not found.</Content>
      </PageSection>
    );
  }

  const description = asset.description || asset.properties?.description || '';
  const format = asset.format || asset.properties?.format || '';
  const location = asset.location || '';
  const connectionRef = asset.connection_ref || asset.properties?.['connection-ref'] || '';
  const columns = asset.columns || [];

  const tags = { ...(asset.tags || {}), ...(asset.properties || {}) };
  const metaKeys = ['description', 'format', 'connection-ref', 'volume_type', 'location'];
  const displayTags = Object.entries(tags).filter(([k]) => !metaKeys.includes(k));
  const PROPERTY_KEYS = ['pii', 'purpose', 'maturity', 'domain', 'license'];
  const detailPropertyEntries = displayTags.filter(([k]) => PROPERTY_KEYS.includes(k.toLowerCase()));
  const detailLabelEntries = displayTags.filter(([k]) => !PROPERTY_KEYS.includes(k.toLowerCase()));

  return (
    <>
      <PageSection style={{ paddingBottom: '0' }}>
        <Breadcrumb>
          <BreadcrumbItem>
            <Link to={`/ai-hub/data/collections?project=${project}&tab=assets`}>
              Data Registry &ndash; {project}
            </Link>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <Link to={`/ai-hub/data/collections/${namespace}?project=${project}`}>
              {namespace}
            </Link>
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{assetName}</BreadcrumbItem>
        </Breadcrumb>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }} style={{ marginTop: 'var(--pf-t--global--spacer--md)' }}>
          <FlexItem>
            <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsMd' }}>
              <FlexItem><Title headingLevel="h1" size="2xl">{assetName}</Title></FlexItem>
              <FlexItem><Label isCompact>{isVolume ? 'Volume' : 'Table'}</Label></FlexItem>
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
                <DropdownItem key="edit" onClick={() => { setDetailKebabOpen(false); onEdit(); }}>Edit</DropdownItem>
                <DropdownItem key="delete" onClick={() => { setDetailKebabOpen(false); onDelete(); }}>Delete</DropdownItem>
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
                    <CardTitle>Assets details</CardTitle>
                    <CardBody>
                      <Grid hasGutter>
                        <GridItem span={6}>
                          <DescriptionList>
                            <DescriptionListGroup>
                              <DescriptionListTerm>Description</DescriptionListTerm>
                              <DescriptionListDescription>{description || '—'}</DescriptionListDescription>
                            </DescriptionListGroup>
                            {format && (
                              <DescriptionListGroup>
                                <DescriptionListTerm>Format</DescriptionListTerm>
                                <DescriptionListDescription>
                                  <Label isCompact variant="outline" color={FORMAT_COLORS[format] || 'grey'}>{format}</Label>
                                </DescriptionListDescription>
                              </DescriptionListGroup>
                            )}
                            <DescriptionListGroup>
                              <DescriptionListTerm>Collection</DescriptionListTerm>
                              <DescriptionListDescription>
                                <Link to={`/ai-hub/data/collections/${namespace}?project=${project}`}>{namespace}</Link>
                              </DescriptionListDescription>
                            </DescriptionListGroup>
                            {connectionRef && (
                              <DescriptionListGroup>
                                <DescriptionListTerm>Connection</DescriptionListTerm>
                                <DescriptionListDescription>
                                  <Link to={`/ai-hub/connections/${connectionRef}?project=${project}`}>{connectionRef}</Link>
                                </DescriptionListDescription>
                              </DescriptionListGroup>
                            )}
                            <DescriptionListGroup>
                              <DescriptionListTerm>Path</DescriptionListTerm>
                              <DescriptionListDescription style={{ wordBreak: 'break-all', color: 'var(--pf-t--global--text--color--subtle)' }}>{location || '—'}</DescriptionListDescription>
                            </DescriptionListGroup>
                          </DescriptionList>
                        </GridItem>
                        <GridItem span={6}>
                          <DescriptionList>
                            <DescriptionListGroup>
                              <DescriptionListTerm>Asset type</DescriptionListTerm>
                              <DescriptionListDescription>{isVolume ? 'Volume' : 'Table'}</DescriptionListDescription>
                            </DescriptionListGroup>
                            <DescriptionListGroup>
                              <DescriptionListTerm>Owner</DescriptionListTerm>
                              <DescriptionListDescription>{asset.properties?.registered_by || userId}</DescriptionListDescription>
                            </DescriptionListGroup>
                            <DescriptionListGroup>
                              <DescriptionListTerm>Created</DescriptionListTerm>
                              <DescriptionListDescription>6/15/2026, 10:32:00 AM by {userId}</DescriptionListDescription>
                            </DescriptionListGroup>
                            <DescriptionListGroup>
                              <DescriptionListTerm>Last modified</DescriptionListTerm>
                              <DescriptionListDescription>6/15/2026, 10:32:00 AM by {userId}</DescriptionListDescription>
                            </DescriptionListGroup>
                          </DescriptionList>
                        </GridItem>
                      </Grid>
                    </CardBody>
                  </Card>
                </GridItem>

                <GridItem span={4}>
                  <Card>
                    <CardTitle>Metadata</CardTitle>
                    <CardBody>
                      <DescriptionList>
                        <DescriptionListGroup>
                          <DescriptionListTerm>Properties</DescriptionListTerm>
                          <DescriptionListDescription>
                            {detailPropertyEntries.length > 0 ? (
                              <>
                                <div
                                  ref={propsRef}
                                  style={{
                                    maxHeight: propsExpanded ? 'none' : `${collapsedHeight}px`,
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '8px',
                                  }}
                                >
                                  {detailPropertyEntries.map(([k, v]) => (
                                    <Label key={k} isCompact variant="outline">{k}: {v}</Label>
                                  ))}
                                </div>
                                {propsOverflows && (
                                  <Button variant="plain" isInline onClick={() => setPropsExpanded(!propsExpanded)} style={{ fontSize: 'var(--pf-t--global--font--size--body--sm)', paddingTop: 'var(--pf-t--global--spacer--xs)' }}>
                                    {propsExpanded ? 'Show less' : `${detailPropertyEntries.length - Math.floor(collapsedHeight / LABEL_ROW_HEIGHT)} more`}
                                  </Button>
                                )}
                              </>
                            ) : '—'}
                          </DescriptionListDescription>
                        </DescriptionListGroup>
                        <DescriptionListGroup>
                          <DescriptionListTerm>Labels</DescriptionListTerm>
                          <DescriptionListDescription>
                            {detailLabelEntries.length > 0 ? (
                              <>
                                <div
                                  ref={labelsRef}
                                  style={{
                                    maxHeight: labelsExpanded ? 'none' : `${collapsedHeight}px`,
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '8px',
                                  }}
                                >
                                  {detailLabelEntries.map(([k, v]) => (
                                    <Label key={k} isCompact variant="outline">{k}: {v}</Label>
                                  ))}
                                </div>
                                {labelsOverflows && (
                                  <Button variant="plain" isInline onClick={() => setLabelsExpanded(!labelsExpanded)} style={{ fontSize: 'var(--pf-t--global--font--size--body--sm)', paddingTop: 'var(--pf-t--global--spacer--xs)' }}>
                                    {labelsExpanded ? 'Show less' : `${detailLabelEntries.length - Math.floor(collapsedHeight / LABEL_ROW_HEIGHT)} more`}
                                  </Button>
                                )}
                              </>
                            ) : '—'}
                          </DescriptionListDescription>
                        </DescriptionListGroup>
                      </DescriptionList>
                    </CardBody>
                  </Card>

                  <Card style={{ marginTop: 'var(--pf-t--global--spacer--md)' }}>
                    <CardTitle>Schema</CardTitle>
                    <CardBody>
                      {columns.length > 0 ? (
                        <>
                          <Content component="p" style={{ marginBottom: 'var(--pf-t--global--spacer--md)', color: 'var(--pf-t--global--text--color--subtle)' }}>
                            {columns.length} column{columns.length !== 1 ? 's' : ''}
                          </Content>
                          <Table variant="compact" aria-label="Schema columns">
                            <Thead>
                              <Tr>
                                <Th>Name</Th>
                                <Th>Type</Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {columns.map((col, i) => (
                                <Tr key={i}>
                                  <Td>{col.name}</Td>
                                  <Td><Label isCompact variant="outline">{col.type}</Label></Td>
                                </Tr>
                              ))}
                            </Tbody>
                          </Table>
                        </>
                      ) : (
                        <Content component="p" style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>No schema available</Content>
                      )}
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
};

const CollectionDetailContent: React.FC<{
  project: string;
  collectionName: string;
  collections: CollectionInfo[];
  onDeleteCollection: () => void;
}> = ({ project, collectionName, collections, onDeleteCollection }) => {
  const [kebabOpen, setKebabOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState('');
  const [deleteAssetsExpanded, setDeleteAssetsExpanded] = React.useState(false);
  const [openAssetKebab, setOpenAssetKebab] = React.useState<string | null>(null);
  const [editTarget, setEditTarget] = React.useState<TableAsset | null>(null);
  const [deleteAssetTarget, setDeleteAssetTarget] = React.useState<{ name: string; namespace: string; isVolume: boolean } | null>(null);
  const [deleteAssetConfirm, setDeleteAssetConfirm] = React.useState('');
  const navigate = useNavigate();
  const deleteTable = useDeleteTable();
  const deleteVolume = useDeleteVolume();

  const collection = collections.find((c) => c.name === collectionName);
  const assetsQuery = useTablesAndVolumes(project, collectionName);
  const assets = assetsQuery.data || [];

  const handleDeleteAsset = async () => {
    if (!deleteAssetTarget) return;
    try {
      if (deleteAssetTarget.isVolume) {
        await deleteVolume.mutateAsync({ project, namespace: deleteAssetTarget.namespace, name: deleteAssetTarget.name });
      } else {
        await deleteTable.mutateAsync({ project, namespace: deleteAssetTarget.namespace, name: deleteAssetTarget.name });
      }
    } finally {
      setDeleteAssetTarget(null);
      setDeleteAssetConfirm('');
    }
  };

  return (
    <>
      <PageSection style={{ paddingBottom: '0' }}>
        <Breadcrumb>
          <BreadcrumbItem>
            <Link to={`/ai-hub/data/collections?project=${project}&tab=assets`}>
              Data Registry &ndash; {project}
            </Link>
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{collectionName}</BreadcrumbItem>
        </Breadcrumb>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }} style={{ marginTop: 'var(--pf-t--global--spacer--md)' }}>
          <FlexItem>
            <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsMd' }}>
              <FlexItem><Title headingLevel="h1" size="2xl">{collectionName}</Title></FlexItem>
              <FlexItem><Label isCompact>Collection</Label></FlexItem>
            </Flex>
            {collection?.description && (
              <Content component="p" style={{ color: 'var(--pf-t--global--text--color--subtle)', marginTop: 'var(--pf-t--global--spacer--xs)' }}>{collection.description}</Content>
            )}
          </FlexItem>
          <FlexItem>
            <Dropdown
              isOpen={kebabOpen}
              onOpenChange={setKebabOpen}
              toggle={(toggleRef) => (
                <MenuToggle ref={toggleRef} variant="plain" onClick={() => setKebabOpen(!kebabOpen)} isExpanded={kebabOpen}>
                  <EllipsisVIcon />
                </MenuToggle>
              )}
              popperProps={{ position: 'right' }}
            >
              <DropdownList>
                <DropdownItem key="delete" onClick={() => { setKebabOpen(false); setDeleteOpen(true); }}>Delete collection</DropdownItem>
              </DropdownList>
            </Dropdown>
          </FlexItem>
        </Flex>
      </PageSection>

      <PageSection>
        <Grid hasGutter>
          <GridItem span={8}>
            <Card>
              <CardTitle>Data assets ({assets.length})</CardTitle>
              <CardBody>
                {assetsQuery.isLoading ? (
                  <Bullseye style={{ minHeight: 'var(--pf-t--global--spacer--3xl)' }}><Spinner /></Bullseye>
                ) : assets.length === 0 ? (
                  <Content component="p" style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>No data assets in this collection.</Content>
                ) : (
                  <Table aria-label="Collection assets" variant="compact">
                    <Thead>
                      <Tr>
                        <Th>Name</Th>
                        <Th>Type</Th>
                        <Th>Format</Th>
                        <Th />
                      </Tr>
                    </Thead>
                    <Tbody>
                      {assets.map((asset) => {
                        const rowKey = `${asset.name}-${asset.isVolume ? 'v' : 't'}`;
                        return (
                          <Tr key={rowKey}>
                            <Td>
                              <Link to={`/ai-hub/data/collections/${collectionName}/${asset.name}?project=${project}${asset.isVolume ? '&type=volume' : ''}`}>
                                {asset.name}
                              </Link>
                            </Td>
                            <Td>{asset.isVolume ? 'Volume' : 'Table'}</Td>
                            <Td>
                              {asset.isVolume ? (
                                <Label isCompact variant="outline" color="grey">Unstructured</Label>
                              ) : asset.format ? (
                                <Label isCompact variant="outline" color={FORMAT_COLORS[asset.format] || 'grey'}>{asset.format}</Label>
                              ) : '—'}
                            </Td>
                            <Td isActionCell>
                              <Dropdown
                                isOpen={openAssetKebab === rowKey}
                                onOpenChange={(open) => setOpenAssetKebab(open ? rowKey : null)}
                                toggle={(toggleRef) => (
                                  <MenuToggle
                                    ref={toggleRef}
                                    variant="plain"
                                    onClick={() => setOpenAssetKebab(openAssetKebab === rowKey ? null : rowKey)}
                                    isExpanded={openAssetKebab === rowKey}
                                  >
                                    <EllipsisVIcon />
                                  </MenuToggle>
                                )}
                                popperProps={{ position: 'right' }}
                              >
                                <DropdownList>
                                  <DropdownItem key="edit" onClick={() => { setEditTarget(asset); setOpenAssetKebab(null); }}>
                                    Edit
                                  </DropdownItem>
                                  <DropdownItem key="delete" onClick={() => {
                                    setDeleteAssetTarget({ name: asset.name, namespace: asset.namespace, isVolume: asset.isVolume });
                                    setOpenAssetKebab(null);
                                  }}>
                                    Delete
                                  </DropdownItem>
                                  <DropdownItem key="provenance" isDisabled>
                                    View provenance
                                  </DropdownItem>
                                </DropdownList>
                              </Dropdown>
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                )}
              </CardBody>
            </Card>
          </GridItem>

          <GridItem span={4}>
            <Card>
              <CardTitle>Collection details</CardTitle>
              <CardBody>
                <DescriptionList isHorizontal>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Tables</DescriptionListTerm>
                    <DescriptionListDescription>{collection?.tableCount ?? '—'}</DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Volumes</DescriptionListTerm>
                    <DescriptionListDescription>{collection?.volumeCount ?? '—'}</DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Owner</DescriptionListTerm>
                    <DescriptionListDescription>{collection?.properties?.created_by || 'system:admin'}</DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Created</DescriptionListTerm>
                    <DescriptionListDescription>{collection?.createdDate || '6/10/2026, 9:15:00 AM'}</DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Last modified</DescriptionListTerm>
                    <DescriptionListDescription>{'7/22/2026, 1:45:30 PM'}</DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>

                {collection?.properties && Object.keys(collection.properties).filter((k) => k !== 'description' && k !== 'created_by').length > 0 && (
                  <>
                    <Divider style={{ marginTop: 'var(--pf-t--global--spacer--md)', marginBottom: 'var(--pf-t--global--spacer--md)' }} />
                    <Title headingLevel="h4" size="md" style={{ marginBottom: 'var(--pf-t--global--spacer--sm)' }}>Properties</Title>
                    <LabelGroup isCompact>
                      {Object.entries(collection.properties)
                        .filter(([k]) => k !== 'description' && k !== 'created_by')
                        .map(([k, v]) => (
                          <Label key={k} isCompact variant="outline">{k}: {v}</Label>
                        ))}
                    </LabelGroup>
                  </>
                )}
              </CardBody>
            </Card>
          </GridItem>
        </Grid>
      </PageSection>

      {deleteOpen && (
        <Modal variant={ModalVariant.medium} isOpen onClose={() => { setDeleteOpen(false); setDeleteConfirmText(''); }} aria-label="Delete collection">
          <ModalHeader title={`Permanently delete collection “${collectionName}”?`} titleIconVariant="warning" />
          <ModalBody>
            <p style={{ marginBottom: 'var(--pf-t--global--spacer--md)' }}>
              This action cannot be undone. {assets.length} data asset{assets.length !== 1 ? 's' : ''} associated with this collection will be permanently deleted.
            </p>
            <ExpandableSection toggleText={`${deleteAssetsExpanded ? 'Hide' : 'Show'} ${assets.length} affected asset${assets.length !== 1 ? 's' : ''}`} isExpanded={deleteAssetsExpanded} onToggle={(_e, expanded) => setDeleteAssetsExpanded(expanded)} style={{ marginBottom: 'var(--pf-t--global--spacer--md)' }}>
              <div style={{ paddingTop: 'var(--pf-t--global--spacer--sm)' }}>
                {assets.map((a) => (
                  <div key={a.uuid}>{a.name} ({a.isVolume ? a.volumeType || 'Volume' : a.format ? a.format.charAt(0).toUpperCase() + a.format.slice(1) : 'Table'})</div>
                ))}
              </div>
            </ExpandableSection>
            <FormGroup label={<span>To confirm deletion, type <strong>{collectionName}</strong> below:</span>} isRequired fieldId="delete-collection-confirm">
              <TextInput id="delete-collection-confirm" value={deleteConfirmText} onChange={(_e, v) => setDeleteConfirmText(v)} placeholder={collectionName} />
            </FormGroup>
          </ModalBody>
          <ModalFooter>
            <Button variant="danger" isDisabled={deleteConfirmText !== collectionName} onClick={() => { setDeleteOpen(false); setDeleteConfirmText(''); onDeleteCollection(); }}>Delete collection and assets</Button>
            <Button variant="link" onClick={() => { setDeleteOpen(false); setDeleteConfirmText(''); }}>Cancel</Button>
          </ModalFooter>
        </Modal>
      )}

      {deleteAssetTarget && (
        <Modal variant={ModalVariant.medium} isOpen onClose={() => { setDeleteAssetTarget(null); setDeleteAssetConfirm(''); }} aria-label="Delete asset">
          <ModalHeader title={`Permanently delete "${deleteAssetTarget.name}" ${deleteAssetTarget.isVolume ? 'volume' : 'table'}?`} titleIconVariant="warning" />
          <ModalBody>
            <p style={{ marginBottom: 'var(--pf-t--global--spacer--md)' }}><strong>{deleteAssetTarget.name}</strong> and its data will be lost forever.</p>
            <FormGroup label={<span>To confirm deletion, type <strong>{deleteAssetTarget.name}</strong> below:</span>} isRequired fieldId="delete-asset-confirm">
              <TextInput id="delete-asset-confirm" value={deleteAssetConfirm} onChange={(_e, v) => setDeleteAssetConfirm(v)} placeholder={deleteAssetTarget.name} />
            </FormGroup>
          </ModalBody>
          <ModalFooter>
            <Button variant="danger" onClick={handleDeleteAsset} isLoading={deleteTable.isPending || deleteVolume.isPending} isDisabled={deleteAssetConfirm !== deleteAssetTarget.name}>Delete</Button>
            <Button variant="link" onClick={() => { setDeleteAssetTarget(null); setDeleteAssetConfirm(''); }}>Cancel</Button>
          </ModalFooter>
        </Modal>
      )}

      {editTarget && !editTarget.isVolume && (
        <EditTableModal
          project={project}
          namespace={editTarget.namespace}
          name={editTarget.name}
          currentDescription={editTarget.description}
          currentProperties={editTarget.properties}
          onClose={() => setEditTarget(null)}
        />
      )}
      {editTarget && editTarget.isVolume && (
        <EditVolumeModal
          project={project}
          namespace={editTarget.namespace}
          name={editTarget.name}
          currentDescription={editTarget.description}
          currentLocation={editTarget.location}
          currentProperties={editTarget.properties}
          onClose={() => setEditTarget(null)}
        />
      )}
    </>
  );
};

function useMultiCollectionAssets(project: string, collections: string[]): TableAsset[] {
  const results = useQueries({
    queries: collections.map((c) => ({
      queryKey: ['catalog', 'tables-and-volumes', project, c],
      queryFn: () => fetchTablesAndVolumes(project, c),
      enabled: !!project && !!c,
    })),
  });
  return React.useMemo(() => {
    const all: TableAsset[] = [];
    for (const r of results) {
      if (r.data) all.push(...r.data);
    }
    return all;
  }, [results]);
}

export default DataRegistryPage;
