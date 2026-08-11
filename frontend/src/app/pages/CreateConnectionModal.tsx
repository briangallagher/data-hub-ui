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
  TextArea,
  FormSelect,
  FormSelectOption,
  Alert,
  InputGroup,
  InputGroupItem,
  InputGroupText,
  Flex,
  FlexItem,
  Content,
  Popover,
  HelperText,
  HelperTextItem,
  FileUpload,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon, InfoCircleIcon } from '@patternfly/react-icons';
import { useCreateConnection } from './useCatalogApi';

interface CreateConnectionModalProps {
  project: string;
  onClose: () => void;
}

const CONNECTION_TYPES = [
  { value: '', label: 'Select a type, or search by keyword or category', isPlaceholder: true },
  { value: 'oci', label: 'OCI compliant registry – v1' },
  { value: 's3', label: 'S3 compatible object storage – v1' },
  { value: 'postgresql', label: 'PostgreSQL – v1' },
  { value: 'uri', label: 'URI – v1' },
];

const ACCESS_TYPES = [
  { value: '', label: 'Select access type', isPlaceholder: true },
  { value: 'push-pull', label: 'Push and pull' },
  { value: 'pull', label: 'Pull only' },
];

const CreateConnectionModal: React.FC<CreateConnectionModalProps> = ({ project, onClose }) => {
  const [connectionType, setConnectionType] = React.useState('');
  const [name, setName] = React.useState('');
  const [showResourceName, setShowResourceName] = React.useState(false);
  const [resourceName, setResourceName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [accessType, setAccessType] = React.useState('');
  const [secretFile, setSecretFile] = React.useState<string>('');
  const [secretFilename, setSecretFilename] = React.useState('');
  const [accessKey, setAccessKey] = React.useState('');
  const [secretKey, setSecretKey] = React.useState('');
  const [endpoint, setEndpoint] = React.useState('');
  const [bucket, setBucket] = React.useState('');
  const [region, setRegion] = React.useState('');
  const [registryHost, setRegistryHost] = React.useState('');
  const [error, setError] = React.useState('');

  const createMutation = useCreateConnection();

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Connection name is required');
      return;
    }
    setError('');
    try {
      await createMutation.mutateAsync({
        namespace: project,
        name: resourceName.trim() || name.trim().toLowerCase().replace(/\s+/g, '-'),
        displayName: name.trim(),
        description,
        connectionType,
        accessKey,
        secretKey,
        endpoint,
        bucket,
        region,
      });
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to create connection');
    }
  };

  const questionIcon = (tooltip: string) => (
    <Popover bodyContent={tooltip}>
      <Button variant="plain" isInline aria-label="More info" style={{ padding: 0, marginLeft: '4px' }}>
        <OutlinedQuestionCircleIcon />
      </Button>
    </Popover>
  );

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen
      onClose={onClose}
      aria-label="Create connection"
    >
      <ModalHeader title="Create connection" description="Configure your connection to an external resource." />
      <ModalBody>
        {error && (
          <Alert variant="danger" isInline title={error} style={{ marginBottom: 'var(--pf-t--global--spacer--md)' }} />
        )}
        <Form>
          <FormGroup
            label={<span>Connection type {questionIcon('The type of external resource this connection will link to.')}</span>}
            isRequired
            fieldId="connection-type"
          >
            <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsMd' }}>
              <FlexItem grow={{ default: 'grow' }}>
                <FormSelect
                  id="connection-type"
                  value={connectionType}
                  onChange={(_event, val) => setConnectionType(val)}
                  aria-label="Connection type"
                >
                  {CONNECTION_TYPES.map((t) => (
                    <FormSelectOption key={t.value} value={t.value} label={t.label} isPlaceholder={t.isPlaceholder} />
                  ))}
                </FormSelect>
              </FlexItem>
              <FlexItem>
                <Button variant="link" icon={<InfoCircleIcon />} isInline isDisabled={!connectionType}>
                  View details
                </Button>
              </FlexItem>
            </Flex>
          </FormGroup>

          {connectionType && (
            <>
              <FormGroup label="Connection name" isRequired fieldId="connection-name">
                <TextInput
                  id="connection-name"
                  value={name}
                  onChange={(_event, val) => setName(val)}
                  placeholder="Connection A"
                  aria-label="Connection name"
                />
                <div style={{ marginTop: 'var(--pf-t--global--spacer--xs)' }}>
                  <Button variant="link" isInline onClick={() => setShowResourceName(!showResourceName)} style={{ fontSize: 'var(--pf-t--global--font--size--sm)' }}>
                    Edit resource name
                  </Button>
                  {questionIcon('The resource name is used as the Kubernetes resource identifier.')}
                </div>
              </FormGroup>

              {showResourceName && (
                <FormGroup label="Resource name" fieldId="connection-resource-name">
                  <TextInput
                    id="connection-resource-name"
                    value={resourceName}
                    onChange={(_event, val) => setResourceName(val)}
                    placeholder={name ? name.toLowerCase().replace(/\s+/g, '-') : 'my-connection'}
                    aria-label="Resource name"
                  />
                </FormGroup>
              )}

              <FormGroup label="Connection description" fieldId="connection-description">
                <TextArea
                  id="connection-description"
                  value={description}
                  onChange={(_event, val) => setDescription(val)}
                  aria-label="Connection description"
                  resizeOrientation="vertical"
                />
              </FormGroup>

              {connectionType === 'oci' && (
                <>
                  <FormGroup
                    label={<span>Access type {questionIcon('Determines whether this connection can push artifacts or only pull them.')}</span>}
                    fieldId="connection-access-type"
                  >
                    <FormSelect
                      id="connection-access-type"
                      value={accessType}
                      onChange={(_event, val) => setAccessType(val)}
                      aria-label="Access type"
                    >
                      {ACCESS_TYPES.map((t) => (
                        <FormSelectOption key={t.value} value={t.value} label={t.label} isPlaceholder={t.isPlaceholder} />
                      ))}
                    </FormSelect>
                  </FormGroup>

                  <FormGroup
                    label={<span>Secret details {questionIcon('Credentials used to authenticate with the registry.')}</span>}
                    fieldId="connection-secret"
                  >
                    <Content component="p" style={{ color: 'var(--pf-t--global--text--color--subtle)', marginBottom: 'var(--pf-t--global--spacer--sm)', fontSize: 'var(--pf-t--global--font--size--sm)' }}>
                      These credentials are saved securely as a user-level secret and are used to authenticate your access.
                    </Content>
                    <FileUpload
                      id="connection-secret-file"
                      type="text"
                      value={secretFile}
                      filename={secretFilename}
                      filenamePlaceholder="Drag and drop a file or upload"
                      onFileInputChange={(_event, file) => {
                        setSecretFilename(file.name);
                        const reader = new FileReader();
                        reader.onload = () => setSecretFile(reader.result as string);
                        reader.readAsText(file);
                      }}
                      onDataChange={(_event, val) => setSecretFile(val)}
                      onTextChange={(_event, val) => setSecretFile(val)}
                      onClearClick={() => { setSecretFile(''); setSecretFilename(''); }}
                      browseButtonText="Upload"
                      clearButtonText="Clear"
                    />
                    <HelperText style={{ marginTop: 'var(--pf-t--global--spacer--xs)' }}>
                      <HelperTextItem>File format must be .dockerconfigjson or .json</HelperTextItem>
                    </HelperText>
                    <Alert variant="info" isInline isPlain title="Secret details are visible to users with access to this project." style={{ marginTop: 'var(--pf-t--global--spacer--md)' }} />
                  </FormGroup>

                  <FormGroup
                    label={<span>Registry host {questionIcon('The hostname of your OCI-compliant registry.')}</span>}
                    fieldId="connection-registry-host"
                  >
                    <TextInput
                      id="connection-registry-host"
                      value={registryHost}
                      onChange={(_event, val) => setRegistryHost(val)}
                      placeholder="My registry"
                      aria-label="Registry host"
                    />
                  </FormGroup>
                </>
              )}

              {connectionType === 's3' && (
                <>
                  <FormGroup label="Access key" isRequired fieldId="connection-access-key">
                    <TextInput
                      id="connection-access-key"
                      value={accessKey}
                      onChange={(_event, val) => setAccessKey(val)}
                      aria-label="Access key"
                    />
                  </FormGroup>

                  <FormGroup label="Secret key" isRequired fieldId="connection-secret-key">
                    <TextInput
                      id="connection-secret-key"
                      type="password"
                      value={secretKey}
                      onChange={(_event, val) => setSecretKey(val)}
                      aria-label="Secret key"
                    />
                  </FormGroup>

                  <FormGroup label="Endpoint" fieldId="connection-endpoint">
                    <TextInput
                      id="connection-endpoint"
                      value={endpoint}
                      onChange={(_event, val) => setEndpoint(val)}
                      placeholder="https://s3.amazonaws.com"
                      aria-label="Endpoint"
                    />
                  </FormGroup>

                  <FormGroup label="Bucket" fieldId="connection-bucket">
                    <TextInput
                      id="connection-bucket"
                      value={bucket}
                      onChange={(_event, val) => setBucket(val)}
                      aria-label="Bucket"
                    />
                  </FormGroup>

                  <FormGroup label="Region" fieldId="connection-region">
                    <TextInput
                      id="connection-region"
                      value={region}
                      onChange={(_event, val) => setRegion(val)}
                      placeholder="us-east-1"
                      aria-label="Region"
                    />
                  </FormGroup>
                </>
              )}

              {connectionType === 'postgresql' && (
                <>
                  <FormGroup label="Host" isRequired fieldId="connection-pg-host">
                    <TextInput
                      id="connection-pg-host"
                      value={endpoint}
                      onChange={(_event, val) => setEndpoint(val)}
                      placeholder="db.example.com"
                      aria-label="Host"
                    />
                  </FormGroup>

                  <FormGroup label="Port" fieldId="connection-pg-port">
                    <TextInput
                      id="connection-pg-port"
                      value={region}
                      onChange={(_event, val) => setRegion(val)}
                      placeholder="5432"
                      aria-label="Port"
                    />
                  </FormGroup>

                  <FormGroup label="Database" isRequired fieldId="connection-pg-db">
                    <TextInput
                      id="connection-pg-db"
                      value={bucket}
                      onChange={(_event, val) => setBucket(val)}
                      placeholder="mydb"
                      aria-label="Database"
                    />
                  </FormGroup>

                  <FormGroup label="Username" isRequired fieldId="connection-pg-user">
                    <TextInput
                      id="connection-pg-user"
                      value={accessKey}
                      onChange={(_event, val) => setAccessKey(val)}
                      aria-label="Username"
                    />
                  </FormGroup>

                  <FormGroup label="Password" isRequired fieldId="connection-pg-pass">
                    <TextInput
                      id="connection-pg-pass"
                      type="password"
                      value={secretKey}
                      onChange={(_event, val) => setSecretKey(val)}
                      aria-label="Password"
                    />
                  </FormGroup>
                </>
              )}

              {connectionType === 'uri' && (
                <FormGroup label="URI" isRequired fieldId="connection-uri">
                  <TextInput
                    id="connection-uri"
                    value={endpoint}
                    onChange={(_event, val) => setEndpoint(val)}
                    placeholder="https://example.com/data"
                    aria-label="URI"
                  />
                </FormGroup>
              )}
            </>
          )}
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleSubmit}
          isLoading={createMutation.isPending}
          isDisabled={!connectionType || !name.trim() || createMutation.isPending}
        >
          Create
        </Button>
        <Button
          variant="secondary"
          isDisabled={!connectionType || !name.trim()}
        >
          Verify connection
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default CreateConnectionModal;
