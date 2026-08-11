import React from 'react';
import {
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Form,
  FormGroup,
  FormSection,
  TextInput,
  TextArea,
  FormSelect,
  FormSelectOption,
  Alert,
  Flex,
  FlexItem,
  Checkbox,
  Radio,
  Popover,
  HelperText,
  HelperTextItem,
  Select,
  SelectOption,
  SelectList,
  MenuToggle,
  Divider,
} from '@patternfly/react-core';
import { PlusCircleIcon, MinusCircleIcon, OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { useCreateTable, useCreateVolume, DataConnection } from './useCatalogApi';

interface RegisterDataModalProps {
  project: string;
  namespace: string;
  connections: DataConnection[];
  collectionNames: string[];
  onClose: () => void;
}

const TABLE_FORMAT_OPTIONS = ['iceberg', 'parquet', 'delta', 'csv', 'postgresql', 'mysql', 'snowflake', 'mssql', 'mongodb'];
const COLUMN_TYPE_OPTIONS = [
  'string', 'integer', 'long', 'float', 'double',
  'decimal', 'boolean', 'date', 'timestamp', 'binary',
];
const CONTENT_TYPE_OPTIONS = [
  { value: '', label: 'Select content type' },
  { value: 'application/pdf', label: 'application/pdf' },
  { value: 'application/parquet', label: 'application/parquet' },
  { value: 'text/csv', label: 'text/csv' },
  { value: 'application/json', label: 'application/json' },
  { value: 'dataset/huggingface', label: 'dataset/huggingface' },
  { value: 'dataset/git', label: 'dataset/git' },
  { value: 'image/mixed', label: 'image/mixed' },
  { value: 'other', label: 'other' },
];

const RegisterDataModal: React.FC<RegisterDataModalProps> = ({
  project,
  namespace,
  connections,
  collectionNames,
  onClose,
}) => {
  const [assetType, setAssetType] = React.useState<'table' | 'volume'>('table');
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [format, setFormat] = React.useState('iceberg');
  const [contentType, setContentType] = React.useState('');
  const [connectionRef, setConnectionRef] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [path, setPath] = React.useState('');
  const [selectedCollection, setSelectedCollection] = React.useState('default');
  const [isCollectionOpen, setIsCollectionOpen] = React.useState(false);
  const [showNewCollection, setShowNewCollection] = React.useState(false);
  const [newCollectionName, setNewCollectionName] = React.useState('');
  const [accessMode, setAccessMode] = React.useState<'connection' | 'location'>('connection');
  const [columns, setColumns] = React.useState<Array<{ name: string; type: string; description: string; nullable: boolean }>>([]);
  const [error, setError] = React.useState('');

  const [purpose, setPurpose] = React.useState('');
  const [license, setLicense] = React.useState('');
  const [maturity, setMaturity] = React.useState('');
  const [domain, setDomain] = React.useState('');
  const [pii, setPii] = React.useState('');

  const [customProps, setCustomProps] = React.useState<Array<{ key: string; value: string }>>([]);

  const createTable = useCreateTable();
  const createVolume = useCreateVolume();
  const isPending = createTable.isPending || createVolume.isPending;

  const handleAddProperty = () => {
    setCustomProps([...customProps, { key: '', value: '' }]);
  };

  const handlePropertyChange = (index: number, field: 'key' | 'value', val: string) => {
    setCustomProps(customProps.map((p, i) => (i === index ? { ...p, [field]: val } : p)));
  };

  const handleRemoveProperty = (index: number) => {
    setCustomProps(customProps.filter((_, i) => i !== index));
  };

  const handleAddColumn = () => {
    setColumns([...columns, { name: '', type: 'string', description: '', nullable: true }]);
  };

  const handleRemoveColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const handleColumnChange = (index: number, field: 'name' | 'type' | 'description' | 'nullable', value: string | boolean) => {
    setColumns(columns.map((col, i) => (i === index ? { ...col, [field]: value } : col)));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (assetType === 'volume' && accessMode === 'location' && !location.trim()) {
      setError('Storage location is required');
      return;
    }
    if (assetType === 'volume' && accessMode === 'connection' && !connectionRef) {
      setError('Please select a connection');
      return;
    }
    setError('');

    const properties: Record<string, string> = {};
    if (purpose.trim()) properties.purpose = purpose.trim();
    if (license) properties.license = license;
    if (maturity) properties.maturity = maturity;
    if (domain.trim()) properties.domain = domain.trim();
    if (pii) properties.pii = pii;
    customProps.forEach((p) => {
      if (p.key.trim()) properties[p.key.trim()] = p.value.trim();
    });

    const effectiveLocation = accessMode === 'location' ? location : '';
    const effectiveConnection = accessMode === 'connection' ? connectionRef : '';

    try {
      if (assetType === 'table') {
        const schemaFields = columns
          .filter((c) => c.name.trim())
          .map((c) => ({
            name: c.name.trim(),
            type: c.type,
            description: c.description.trim() || undefined,
            nullable: c.nullable,
          }));

        await createTable.mutateAsync({
          project,
          name: name.trim(),
          namespace,
          description,
          format,
          volumeType: '',
          location: effectiveLocation,
          connectionRef: effectiveConnection,
          tags: {},
          isVolume: false,
          schemaFields: schemaFields.length > 0 ? schemaFields : undefined,
          properties: Object.keys(properties).length > 0 ? properties : undefined,
        });
      } else {
        await createVolume.mutateAsync({
          project,
          name: name.trim(),
          namespace,
          description,
          format: contentType,
          volumeType: 'EXTERNAL',
          location: effectiveLocation,
          connectionRef: effectiveConnection,
          tags: {},
          isVolume: true,
          properties: Object.keys(properties).length > 0 ? properties : undefined,
        });
      }
      onClose();
    } catch (e: any) {
      setError(e.message || `Failed to create ${assetType}`);
    }
  };

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen
      onClose={onClose}
      aria-label="Register data"
    >
      <ModalHeader title="Register data" />
      <ModalBody>
        {error && (
          <Alert variant="danger" isInline title={error} style={{ marginBottom: '16px' }} />
        )}
        <Form>
          <FormGroup label="Asset type" isRequired fieldId="asset-type" labelHelp={
              <Popover bodyContent="Tables represent structured data with a defined schema (e.g. Iceberg, Parquet). Volumes represent unstructured data such as PDFs, images, or raw files.">
                <Button variant="plain" aria-label="More info about asset type" style={{ padding: 0 }}><OutlinedQuestionCircleIcon color="var(--pf-t--global--text--color--subtle)" /></Button>
              </Popover>
            }>
            <Flex>
              <FlexItem>
                <Radio
                  id="asset-type-table"
                  name="asset-type"
                  label="Table"
                  isChecked={assetType === 'table'}
                  onChange={() => setAssetType('table')}
                />
              </FlexItem>
              <FlexItem>
                <Radio
                  id="asset-type-volume"
                  name="asset-type"
                  label="Volume"
                  isChecked={assetType === 'volume'}
                  onChange={() => setAssetType('volume')}
                />
              </FlexItem>
            </Flex>
          </FormGroup>

          <FormGroup label="Name" isRequired fieldId="data-name">
            <TextInput
              id="data-name"
              value={name}
              onChange={(_event, val) => setName(val)}
              isRequired
            />
          </FormGroup>

          <FormGroup label="Description" fieldId="data-description">
            <TextArea
              id="data-description"
              value={description}
              onChange={(_event, val) => setDescription(val)}
              resizeOrientation="vertical"
              rows={3}
            />
          </FormGroup>

          {assetType === 'volume' && (
            <FormGroup label="Type" fieldId="data-volume-type">
              <TextInput
                id="data-volume-type"
                value="External"
                readOnlyVariant="default"
              />
            </FormGroup>
          )}

          {assetType === 'table' && (
            <FormGroup label="Format" fieldId="data-format" labelHelp={
                <Popover bodyContent="The storage format of the table data. This determines how the data is serialized and which query engines can read it.">
                  <Button variant="plain" aria-label="More info about format" style={{ padding: 0 }}><OutlinedQuestionCircleIcon color="var(--pf-t--global--text--color--subtle)" /></Button>
                </Popover>
              }>
              <FormSelect
                id="data-format"
                value={format}
                onChange={(_event, val) => setFormat(val)}
              >
                {TABLE_FORMAT_OPTIONS.map((f) => (
                  <FormSelectOption key={f} value={f} label={f} />
                ))}
              </FormSelect>
            </FormGroup>
          )}

          <FormGroup label="Collection" isRequired fieldId="data-collection">
            <Select
              id="data-collection"
              isOpen={isCollectionOpen}
              selected={selectedCollection}
              onSelect={(_event, value) => {
                if (value === '__create_new__') {
                  setShowNewCollection(true);
                  setSelectedCollection('__create_new__');
                } else {
                  setShowNewCollection(false);
                  setSelectedCollection(value as string);
                }
                setIsCollectionOpen(false);
              }}
              onOpenChange={setIsCollectionOpen}
              toggle={(toggleRef) => (
                <MenuToggle
                  ref={toggleRef}
                  onClick={() => setIsCollectionOpen(!isCollectionOpen)}
                  isExpanded={isCollectionOpen}
                  isFullWidth
                >
                  {selectedCollection === '__create_new__' ? 'Create new collection' : selectedCollection}
                </MenuToggle>
              )}
            >
              <SelectList>
                {(collectionNames.includes('default') ? collectionNames : ['default', ...collectionNames]).map((c) => (
                  <SelectOption key={c} value={c}>{c}</SelectOption>
                ))}
              </SelectList>
              <Divider />
              <SelectList>
                <SelectOption value="__create_new__">Create new collection</SelectOption>
              </SelectList>
            </Select>
            {showNewCollection && (
              <FormGroup label="New collection name" isRequired fieldId="new-collection-name" style={{ marginTop: 'var(--pf-t--global--spacer--md)' }}>
              <TextInput
                id="new-collection-name"
                value={newCollectionName}
                onChange={(_event, val) => setNewCollectionName(val)}
                placeholder="Enter collection name"
                aria-label="New collection name"
              />
              </FormGroup>
            )}
          </FormGroup>

          <FormGroup label="Data access" fieldId="access-mode" labelHelp={
              <Popover bodyContent="Choose how to reference the data location. Use a Data Connection to leverage a pre-configured connection with credentials, or provide a direct storage location URI.">
                <Button variant="plain" aria-label="More info about data access" style={{ padding: 0 }}><OutlinedQuestionCircleIcon color="var(--pf-t--global--text--color--subtle)" /></Button>
              </Popover>
            }>
            <Flex>
              <FlexItem>
                <Radio
                  id="access-mode-connection"
                  name="access-mode"
                  label="Data Connection"
                  isChecked={accessMode === 'connection'}
                  onChange={() => setAccessMode('connection')}
                />
              </FlexItem>
              <FlexItem>
                <Radio
                  id="access-mode-location"
                  name="access-mode"
                  label="Storage location"
                  isChecked={accessMode === 'location'}
                  onChange={() => setAccessMode('location')}
                />
              </FlexItem>
            </Flex>
          </FormGroup>

          {accessMode === 'connection' && (
            <FormGroup label="Connection" fieldId="data-connection">
              <FormSelect
                id="data-connection"
                value={connectionRef}
                onChange={(_event, val) => setConnectionRef(val)}
              >
                <FormSelectOption value="" label="Select a connection" />
                {connections.map((c) => (
                  <FormSelectOption
                    key={c.name}
                    value={c.name}
                    label={`${c.displayName} (${c.connectionType})`}
                  />
                ))}
              </FormSelect>
            </FormGroup>
          )}

          {accessMode === 'location' && (
            <FormGroup label="Storage location" fieldId="data-location">
              <TextInput
                id="data-location"
                value={location}
                onChange={(_event, val) => setLocation(val)}
                placeholder={assetType === 'volume'
                  ? 'e.g. s3://bucket/path, https://huggingface.co/datasets/...'
                  : 's3://bucket/path'}
              />
            </FormGroup>
          )}

          {assetType === 'volume' && (
            <FormGroup label="Content type" fieldId="data-content-type">
              <FormSelect
                id="data-content-type"
                value={contentType}
                onChange={(_event, val) => setContentType(val)}
              >
                {CONTENT_TYPE_OPTIONS.map((o) => (
                  <FormSelectOption key={o.value} value={o.value} label={o.label} />
                ))}
              </FormSelect>
            </FormGroup>
          )}

          <FormGroup label="Path" fieldId="data-path">
            <TextInput
              id="data-path"
              value={path}
              onChange={(_event, val) => setPath(val)}
              aria-label="Path"
            />
          </FormGroup>

          {assetType === 'table' && (
            <FormGroup label="Schema (columns)" fieldId="data-columns" labelHelp={
                <Popover bodyContent="Define the column structure of the table. Each column has a name, data type, optional description, and nullable flag. Schema is optional — it can also be inferred from the data source.">
                  <Button variant="plain" aria-label="More info about schema" style={{ padding: 0 }}><OutlinedQuestionCircleIcon color="var(--pf-t--global--text--color--subtle)" /></Button>
                </Popover>
              }>
              {columns.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <Flex style={{ marginBottom: '4px' }}>
                    <FlexItem style={{ flex: 2 }}><span style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>Name</span></FlexItem>
                    <FlexItem style={{ flex: 1 }}><span style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>Type</span></FlexItem>
                    <FlexItem style={{ flex: 2 }}><span style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>Description</span></FlexItem>
                    <FlexItem style={{ width: '80px' }}><span style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>Nullable</span></FlexItem>
                    <FlexItem style={{ width: '36px' }} />
                  </Flex>
                  {columns.map((col, i) => (
                    <Flex key={i} style={{ marginBottom: '8px' }} alignItems={{ default: 'alignItemsCenter' }}>
                      <FlexItem style={{ flex: 2 }}>
                        <TextInput
                          id={`col-name-${i}`}
                          value={col.name}
                          onChange={(_event, val) => handleColumnChange(i, 'name', val)}
                          placeholder="Example: claim_id"
                        />
                      </FlexItem>
                      <FlexItem style={{ flex: 1 }}>
                        <FormSelect
                          id={`col-type-${i}`}
                          value={col.type}
                          onChange={(_event, val) => handleColumnChange(i, 'type', val)}
                        >
                          {COLUMN_TYPE_OPTIONS.map((t) => (
                            <FormSelectOption key={t} value={t} label={t} />
                          ))}
                        </FormSelect>
                      </FlexItem>
                      <FlexItem style={{ flex: 2 }}>
                        <TextInput
                          id={`col-desc-${i}`}
                          value={col.description}
                          onChange={(_event, val) => handleColumnChange(i, 'description', val)}
                          placeholder="Example: Unique claim identifier"
                        />
                      </FlexItem>
                      <FlexItem style={{ width: '80px' }}>
                        <Checkbox
                          id={`col-nullable-${i}`}
                          isChecked={col.nullable}
                          onChange={(_event, checked) => handleColumnChange(i, 'nullable', checked)}
                        />
                      </FlexItem>
                      <FlexItem style={{ width: '36px' }}>
                        <Button variant="plain" onClick={() => handleRemoveColumn(i)} aria-label="Remove column">
                          <MinusCircleIcon />
                        </Button>
                      </FlexItem>
                    </Flex>
                  ))}
                </div>
              )}
              <Button variant="link" isInline icon={<PlusCircleIcon />} onClick={handleAddColumn}>
                Add column
              </Button>
            </FormGroup>
          )}

          <FormSection title="Properties">

          <FormGroup label="Purpose" fieldId="data-purpose">
            <TextInput
              id="data-purpose"
              value={purpose}
              onChange={(_event, val) => setPurpose(val)}
              placeholder="e.g. ML training and fraud detection"
            />
          </FormGroup>

          <FormGroup label="License" fieldId="data-license">
            <FormSelect
              id="data-license"
              value={license}
              onChange={(_event, val) => setLicense(val)}
            >
              <FormSelectOption value="" label="Select license" />
              <FormSelectOption value="internal-use" label="internal-use" />
              <FormSelectOption value="cc-by-4.0" label="cc-by-4.0" />
              <FormSelectOption value="apache-2.0" label="apache-2.0" />
              <FormSelectOption value="proprietary" label="proprietary" />
              <FormSelectOption value="restricted" label="restricted" />
            </FormSelect>
          </FormGroup>

          <FormGroup label="Maturity" fieldId="data-maturity">
            <FormSelect
              id="data-maturity"
              value={maturity}
              onChange={(_event, val) => setMaturity(val)}
            >
              <FormSelectOption value="" label="Select maturity" />
              <FormSelectOption value="experimental" label="experimental" />
              <FormSelectOption value="staging" label="staging" />
              <FormSelectOption value="production" label="production" />
              <FormSelectOption value="deprecated" label="deprecated" />
            </FormSelect>
          </FormGroup>

          <FormGroup label="Domain" fieldId="data-domain">
            <TextInput
              id="data-domain"
              value={domain}
              onChange={(_event, val) => setDomain(val)}
              placeholder="e.g. insurance, finance, healthcare"
            />
          </FormGroup>

          <FormGroup label="PII" fieldId="data-pii">
            <FormSelect
              id="data-pii"
              value={pii}
              onChange={(_event, val) => setPii(val)}
            >
              <FormSelectOption value="" label="Select PII status" />
              <FormSelectOption value="none" label="none" />
              <FormSelectOption value="contains-pii" label="contains-pii" />
              <FormSelectOption value="contains-sensitive" label="contains-sensitive" />
              <FormSelectOption value="anonymized" label="anonymized" />
            </FormSelect>
          </FormGroup>

          <FormGroup label="Labels" fieldId="data-custom-properties">
            <HelperText style={{ marginBottom: 'var(--pf-t--global--spacer--sm)' }}>
              <HelperTextItem>Optionally, add key/value pair labels to help organize and filter data.</HelperTextItem>
            </HelperText>
            {customProps.length > 0 && (
              <div style={{ marginBottom: '8px' }}>
                <Flex style={{ marginBottom: '4px' }}>
                  <FlexItem style={{ flex: 1 }}><span style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>Key</span></FlexItem>
                  <FlexItem style={{ flex: 1 }}><span style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>Value</span></FlexItem>
                  <FlexItem style={{ width: '36px' }} />
                </Flex>
                {customProps.map((prop, i) => (
                  <Flex key={i} style={{ marginBottom: '8px' }} alignItems={{ default: 'alignItemsCenter' }}>
                    <FlexItem style={{ flex: 1 }}>
                      <TextInput
                        id={`prop-key-${i}`}
                        value={prop.key}
                        onChange={(_event, val) => handlePropertyChange(i, 'key', val)}
                        placeholder="Example: domain"
                      />
                    </FlexItem>
                    <FlexItem style={{ flex: 1 }}>
                      <TextInput
                        id={`prop-value-${i}`}
                        value={prop.value}
                        onChange={(_event, val) => handlePropertyChange(i, 'value', val)}
                        placeholder="Example: underwriting"
                      />
                    </FlexItem>
                    <FlexItem style={{ width: '36px' }}>
                      <Button variant="plain" onClick={() => handleRemoveProperty(i)} aria-label="Remove property">
                        <MinusCircleIcon />
                      </Button>
                    </FlexItem>
                  </Flex>
                ))}
              </div>
            )}
            <Button variant="link" isInline icon={<PlusCircleIcon />} onClick={handleAddProperty}>
              Add property
            </Button>
          </FormGroup>
          </FormSection>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleSubmit}
          isLoading={isPending}
          isDisabled={isPending}
        >
          Register
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default RegisterDataModal;
