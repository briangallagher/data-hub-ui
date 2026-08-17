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
  TextInput,
  FormSelect,
  FormSelectOption,
  Alert,
  Flex,
  FlexItem,
  Checkbox,
  Title,
} from '@patternfly/react-core';
import { useCreateTable, DataConnection } from './useCatalogApi';

interface RegisterTableModalProps {
  project: string;
  namespace: string;
  connections: DataConnection[];
  onClose: () => void;
}

const FORMAT_OPTIONS = ['iceberg', 'parquet', 'delta', 'csv', 'postgresql', 'mysql', 'snowflake', 'mssql', 'mongodb'];
const COLUMN_TYPE_OPTIONS = [
  'string', 'integer', 'long', 'float', 'double',
  'decimal', 'boolean', 'date', 'timestamp', 'binary',
];

const RegisterTableModal: React.FC<RegisterTableModalProps> = ({
  project,
  namespace,
  connections,
  onClose,
}) => {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [format, setFormat] = React.useState('iceberg');
  const [connectionRef, setConnectionRef] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [columns, setColumns] = React.useState<Array<{ name: string; type: string; description: string; nullable: boolean }>>([]);
  const [error, setError] = React.useState('');
  const [accessMode, setAccessMode] = React.useState<'connection' | 'location'>('connection');

  // Properties state
  const [purpose, setPurpose] = React.useState('');
  const [license, setLicense] = React.useState('');
  const [maturity, setMaturity] = React.useState('');
  const [domain, setDomain] = React.useState('');
  const [pii, setPii] = React.useState('');

  // Custom properties (key/value pairs)
  const [customKey, setCustomKey] = React.useState('');
  const [customValue, setCustomValue] = React.useState('');
  const [customProps, setCustomProps] = React.useState<Array<{ key: string; value: string }>>([]);

  const createMutation = useCreateTable();

  const handleAddCustomProp = () => {
    if (customKey.trim()) {
      setCustomProps([...customProps, { key: customKey.trim(), value: customValue.trim() }]);
      setCustomKey('');
      setCustomValue('');
    }
  };

  const handleRemoveCustomProp = (index: number) => {
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
    setError('');

    // Build properties dict
    const customTagsMap: Record<string, string> = {};
    customProps.forEach((t) => { customTagsMap[t.key] = t.value; });

    const properties: Record<string, string> = {};
    if (purpose) properties.purpose = purpose;
    if (license) properties.license = license;
    if (maturity) properties.maturity = maturity;
    if (domain) properties.domain = domain;
    if (pii) properties.pii = pii;
    Object.assign(properties, customTagsMap);

    const effectiveLocation = accessMode === 'location' ? location : '';

    try {
      const schemaFields = columns
        .filter((c) => c.name.trim())
        .map((c) => ({
          name: c.name.trim(),
          type: c.type,
          description: c.description.trim() || undefined,
          nullable: c.nullable,
        }));

      await createMutation.mutateAsync({
        project,
        name: name.trim(),
        namespace,
        description,
        format,
        volumeType: '',
        location: effectiveLocation,
        connectionRef: accessMode === 'connection' ? connectionRef : '',
        tags: [],
        isVolume: false,
        schemaFields: schemaFields.length > 0 ? schemaFields : undefined,
        properties: Object.keys(properties).length > 0 ? properties : undefined,
      });
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to create table');
    }
  };

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen
      onClose={onClose}
      aria-label="Register table"
    >
      <ModalHeader title="Register table" />
      <ModalBody>
        {error && (
          <Alert variant="danger" isInline title={error} style={{ marginBottom: '16px' }} />
        )}
        <Form>
          <FormGroup label="Name" isRequired fieldId="table-name">
            <TextInput
              id="table-name"
              value={name}
              onChange={(_event, val) => setName(val)}
              isRequired
            />
          </FormGroup>

          <FormGroup label="Description" fieldId="table-description">
            <TextInput
              id="table-description"
              value={description}
              onChange={(_event, val) => setDescription(val)}
            />
          </FormGroup>

          <FormGroup label="Format" fieldId="table-format">
            <FormSelect
              id="table-format"
              value={format}
              onChange={(_event, val) => setFormat(val)}
            >
              {FORMAT_OPTIONS.map((f) => (
                <FormSelectOption key={f} value={f} label={f} />
              ))}
            </FormSelect>
          </FormGroup>

          <FormGroup label="Data access" fieldId="access-mode">
            <Flex>
              <FlexItem>
                <Button variant={accessMode === 'connection' ? 'primary' : 'secondary'} onClick={() => setAccessMode('connection')}>
                  Data Connection
                </Button>
              </FlexItem>
              <FlexItem>
                <Button variant={accessMode === 'location' ? 'primary' : 'secondary'} onClick={() => setAccessMode('location')}>
                  Storage location
                </Button>
              </FlexItem>
            </Flex>
          </FormGroup>

          {accessMode === 'connection' && (
            <FormGroup label="Connection" fieldId="table-connection">
              <FormSelect
                id="table-connection"
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
            <FormGroup label="Storage location (S3 URI)" fieldId="table-location">
              <TextInput
                id="table-location"
                value={location}
                onChange={(_event, val) => setLocation(val)}
                placeholder="s3://bucket/path"
              />
            </FormGroup>
          )}

          <FormGroup label="Schema (columns)" fieldId="table-columns">
            {columns.map((col, i) => (
              <Flex key={i} style={{ marginBottom: '8px' }} alignItems={{ default: 'alignItemsCenter' }}>
                <FlexItem>
                  <TextInput
                    id={`col-name-${i}`}
                    value={col.name}
                    onChange={(_event, val) => handleColumnChange(i, 'name', val)}
                    placeholder="Column name"
                    style={{ width: '160px' }}
                  />
                </FlexItem>
                <FlexItem>
                  <FormSelect
                    id={`col-type-${i}`}
                    value={col.type}
                    onChange={(_event, val) => handleColumnChange(i, 'type', val)}
                    style={{ width: '140px' }}
                  >
                    {COLUMN_TYPE_OPTIONS.map((t) => (
                      <FormSelectOption key={t} value={t} label={t} />
                    ))}
                  </FormSelect>
                </FlexItem>
                <FlexItem>
                  <TextInput
                    id={`col-desc-${i}`}
                    value={col.description}
                    onChange={(_event, val) => handleColumnChange(i, 'description', val)}
                    placeholder="Column description"
                    style={{ width: '160px' }}
                  />
                </FlexItem>
                <FlexItem>
                  <Checkbox
                    id={`col-nullable-${i}`}
                    label="Nullable"
                    isChecked={col.nullable}
                    onChange={(_event, checked) => handleColumnChange(i, 'nullable', checked)}
                  />
                </FlexItem>
                <FlexItem>
                  <Button variant="plain" onClick={() => handleRemoveColumn(i)} style={{ padding: '2px' }}>
                    &times;
                  </Button>
                </FlexItem>
              </Flex>
            ))}
            <Button variant="secondary" onClick={handleAddColumn}>
              Add column
            </Button>
          </FormGroup>

          <Title headingLevel="h3" size="md" style={{ marginTop: '16px', marginBottom: '8px' }}>
            Properties
          </Title>

          <FormGroup label="Purpose" fieldId="table-purpose">
            <TextInput
              id="table-purpose"
              value={purpose}
              onChange={(_event, val) => setPurpose(val)}
              placeholder="e.g. Risk assessment model training data"
            />
          </FormGroup>

          <FormGroup label="License" fieldId="table-license">
            <FormSelect
              id="table-license"
              value={license}
              onChange={(_event, val) => setLicense(val)}
            >
              <FormSelectOption value="" label="Select license" />
              <FormSelectOption value="internal-only" label="internal-only" />
              <FormSelectOption value="apache-2.0" label="apache-2.0" />
              <FormSelectOption value="mit" label="mit" />
              <FormSelectOption value="cc-by-4.0" label="cc-by-4.0" />
              <FormSelectOption value="proprietary" label="proprietary" />
              <FormSelectOption value="other" label="other" />
            </FormSelect>
          </FormGroup>

          <FormGroup label="Maturity" fieldId="table-maturity">
            <FormSelect
              id="table-maturity"
              value={maturity}
              onChange={(_event, val) => setMaturity(val)}
            >
              <FormSelectOption value="" label="Select maturity" />
              <FormSelectOption value="raw" label="raw" />
              <FormSelectOption value="curated" label="curated" />
              <FormSelectOption value="production" label="production" />
            </FormSelect>
          </FormGroup>

          <FormGroup label="Domain" fieldId="table-domain">
            <TextInput
              id="table-domain"
              value={domain}
              onChange={(_event, val) => setDomain(val)}
              placeholder="e.g. insurance, finance, healthcare"
            />
          </FormGroup>

          <FormGroup label="PII" fieldId="table-pii">
            <FormSelect
              id="table-pii"
              value={pii}
              onChange={(_event, val) => setPii(val)}
            >
              <FormSelectOption value="" label="Select PII status" />
              <FormSelectOption value="false" label="false" />
              <FormSelectOption value="true" label="true" />
              <FormSelectOption value="unknown" label="unknown" />
            </FormSelect>
          </FormGroup>

          <FormGroup label="Custom properties" fieldId="table-custom-props">
            <Flex>
              <FlexItem>
                <TextInput
                  id="custom-key"
                  value={customKey}
                  onChange={(_event, val) => setCustomKey(val)}
                  placeholder="Key"
                  style={{ width: '160px' }}
                />
              </FlexItem>
              <FlexItem>
                <TextInput
                  id="custom-value"
                  value={customValue}
                  onChange={(_event, val) => setCustomValue(val)}
                  placeholder="Value"
                  style={{ width: '160px' }}
                />
              </FlexItem>
              <FlexItem>
                <Button variant="secondary" onClick={handleAddCustomProp}>
                  Add
                </Button>
              </FlexItem>
            </Flex>
            {customProps.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                {customProps.map((prop, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '4px', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px' }}>{prop.key}: {prop.value}</span>
                    <Button variant="plain" onClick={() => handleRemoveCustomProp(i)} style={{ padding: '2px' }}>
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleSubmit}
          isLoading={createMutation.isPending}
          isDisabled={createMutation.isPending}
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

export default RegisterTableModal;
