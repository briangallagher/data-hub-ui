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
  Hint,
  HintBody,
} from '@patternfly/react-core';
import { EyeIcon, EyeSlashIcon } from '@patternfly/react-icons';
import { useCreateConnection } from './useCatalogApi';

interface CreateConnectionModalProps {
  project: string;
  onClose: () => void;
}

const CONNECTION_TYPES = [
  { value: 's3', label: 'S3 compatible object storage – v1' },
  { value: 'uri', label: 'URI – v1' },
];

const CreateConnectionModal: React.FC<CreateConnectionModalProps> = ({ project, onClose }) => {
  const [step, setStep] = React.useState<'type' | 'details'>('type');
  const [connectionType, setConnectionType] = React.useState('');
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [accessKey, setAccessKey] = React.useState('');
  const [secretKey, setSecretKey] = React.useState('');
  const [endpoint, setEndpoint] = React.useState('');
  const [bucket, setBucket] = React.useState('');
  const [region, setRegion] = React.useState('');
  const [showSecret, setShowSecret] = React.useState(false);
  const [error, setError] = React.useState('');

  const createMutation = useCreateConnection();

  const handleSelectType = () => {
    if (!connectionType) return;
    setStep('details');
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Connection name is required');
      return;
    }
    if (!accessKey.trim()) {
      setError('Access key is required');
      return;
    }
    if (!secretKey.trim()) {
      setError('Secret key is required');
      return;
    }
    setError('');

    try {
      await createMutation.mutateAsync({
        namespace: project,
        name: name.trim(),
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

  if (step === 'type') {
    return (
      <Modal
        variant={ModalVariant.medium}
        isOpen
        onClose={onClose}
        aria-label="Create connection"
      >
        <ModalHeader title="Create connection" />
        <ModalBody>
          <Form>
            <FormGroup label="Connection type" isRequired fieldId="connection-type">
              <FormSelect
                id="connection-type"
                value={connectionType}
                onChange={(_event, val) => setConnectionType(val)}
                aria-label="Connection type"
              >
                <FormSelectOption
                  value=""
                  label="Select a type, or search by keyword or category"
                  isPlaceholder
                />
                {CONNECTION_TYPES.map((t) => (
                  <FormSelectOption key={t.value} value={t.value} label={t.label} />
                ))}
              </FormSelect>
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            isDisabled={!connectionType}
            onClick={handleSelectType}
          >
            Create
          </Button>
          <Button variant="link" onClick={onClose}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    );
  }

  const typeLabel = CONNECTION_TYPES.find((t) => t.value === connectionType)?.label || connectionType;

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen
      onClose={onClose}
      aria-label="Create connection"
    >
      <ModalHeader title="Create connection" />
      <ModalBody>
        {error && (
          <Alert variant="danger" isInline title={error} style={{ marginBottom: '16px' }} />
        )}
        <Form>
          <FormGroup label="Connection type" isRequired fieldId="connection-type-display">
            <FormSelect
              id="connection-type-display"
              value={connectionType}
              onChange={(_event, val) => {
                setConnectionType(val);
                if (!val) setStep('type');
              }}
              aria-label="Connection type"
            >
              {CONNECTION_TYPES.map((t) => (
                <FormSelectOption key={t.value} value={t.value} label={t.label} />
              ))}
            </FormSelect>
          </FormGroup>

          <p style={{ fontWeight: 600, fontSize: '16px', marginTop: '16px', marginBottom: '8px' }}>
            Connection details
          </p>

          <FormGroup label="Connection name" isRequired fieldId="connection-name">
            <TextInput
              id="connection-name"
              value={name}
              onChange={(_event, val) => setName(val)}
              isRequired
              aria-label="Connection name"
            />
          </FormGroup>

          <FormGroup label="Connection description" fieldId="connection-description">
            <TextArea
              id="connection-description"
              value={description}
              onChange={(_event, val) => setDescription(val)}
              aria-label="Connection description"
              resizeOrientation="vertical"
            />
          </FormGroup>

          {connectionType === 's3' && (
            <>
              <FormGroup label="Access key" isRequired fieldId="connection-access-key">
                <TextInput
                  id="connection-access-key"
                  value={accessKey}
                  onChange={(_event, val) => setAccessKey(val)}
                  isRequired
                  aria-label="Access key"
                />
              </FormGroup>

              <FormGroup label="Secret key" isRequired fieldId="connection-secret-key">
                <InputGroup>
                  <InputGroupItem isFill>
                    <TextInput
                      id="connection-secret-key"
                      type={showSecret ? 'text' : 'password'}
                      value={secretKey}
                      onChange={(_event, val) => setSecretKey(val)}
                      isRequired
                      aria-label="Secret key"
                    />
                  </InputGroupItem>
                  <InputGroupItem>
                    <Button
                      variant="control"
                      onClick={() => setShowSecret(!showSecret)}
                      aria-label={showSecret ? 'Hide secret key' : 'Show secret key'}
                    >
                      {showSecret ? <EyeSlashIcon /> : <EyeIcon />}
                    </Button>
                  </InputGroupItem>
                </InputGroup>
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

          {connectionType === 'uri' && (
            <FormGroup label="URI" isRequired fieldId="connection-uri">
              <TextInput
                id="connection-uri"
                value={endpoint}
                onChange={(_event, val) => setEndpoint(val)}
                placeholder="https://example.com/data"
                isRequired
                aria-label="URI"
              />
            </FormGroup>
          )}
        </Form>
        <div style={{ marginTop: '16px' }}>
          <Hint>
            <HintBody>
              Be cautious when sharing sensitive information. Secret details are visible to users
              with access to the project.
            </HintBody>
          </Hint>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleSubmit}
          isLoading={createMutation.isPending}
          isDisabled={createMutation.isPending}
        >
          Create
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default CreateConnectionModal;
