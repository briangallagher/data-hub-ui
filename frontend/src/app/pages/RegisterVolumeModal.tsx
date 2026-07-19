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
} from '@patternfly/react-core';
import { useCreateVolume, DataConnection } from './useCatalogApi';

interface RegisterVolumeModalProps {
  project: string;
  namespace: string;
  connections: DataConnection[];
  onClose: () => void;
}

const RegisterVolumeModal: React.FC<RegisterVolumeModalProps> = ({
  project,
  namespace,
  connections,
  onClose,
}) => {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [connectionRef, setConnectionRef] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [tagKey, setTagKey] = React.useState('');
  const [tagValue, setTagValue] = React.useState('');
  const [tags, setTags] = React.useState<Array<{ key: string; value: string }>>([]);
  const [error, setError] = React.useState('');

  const createMutation = useCreateVolume();

  const handleAddTag = () => {
    if (tagKey.trim()) {
      setTags([...tags, { key: tagKey.trim(), value: tagValue.trim() }]);
      setTagKey('');
      setTagValue('');
    }
  };

  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!location.trim()) {
      setError('Storage location is required');
      return;
    }
    setError('');

    const tagMap: Record<string, string> = {};
    tags.forEach((t) => { tagMap[t.key] = t.value; });

    try {
      await createMutation.mutateAsync({
        project,
        name: name.trim(),
        namespace,
        description,
        format: '',
        volumeType: 'EXTERNAL',
        location,
        connectionRef,
        tags: tagMap,
        isVolume: true,
      });
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to create volume');
    }
  };

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen
      onClose={onClose}
      aria-label="Register volume"
    >
      <ModalHeader title="Register volume" />
      <ModalBody>
        {error && (
          <Alert variant="danger" isInline title={error} style={{ marginBottom: '16px' }} />
        )}
        <Form>
          <FormGroup label="Name" isRequired fieldId="volume-name">
            <TextInput
              id="volume-name"
              value={name}
              onChange={(_event, val) => setName(val)}
              isRequired
            />
          </FormGroup>

          <FormGroup label="Description" fieldId="volume-description">
            <TextInput
              id="volume-description"
              value={description}
              onChange={(_event, val) => setDescription(val)}
            />
          </FormGroup>

          <FormGroup label="Type" fieldId="volume-type">
            <TextInput
              id="volume-type"
              value="EXTERNAL"
              isDisabled
            />
          </FormGroup>

          <FormGroup label="Connection" fieldId="volume-connection">
            <FormSelect
              id="volume-connection"
              value={connectionRef}
              onChange={(_event, val) => setConnectionRef(val)}
            >
              <FormSelectOption value="" label="None — use storage location" />
              {connections.map((c) => (
                <FormSelectOption
                  key={c.name}
                  value={c.name}
                  label={`${c.displayName} (${c.connectionType})`}
                />
              ))}
            </FormSelect>
          </FormGroup>

          <FormGroup label="Storage location (S3 URI)" isRequired fieldId="volume-location">
            <TextInput
              id="volume-location"
              value={location}
              onChange={(_event, val) => setLocation(val)}
              placeholder="s3://bucket/path"
            />
          </FormGroup>

          <FormGroup label="Tags" fieldId="volume-tags">
            <Flex>
              <FlexItem>
                <TextInput
                  id="vol-tag-key"
                  value={tagKey}
                  onChange={(_event, val) => setTagKey(val)}
                  placeholder="Key"
                  style={{ width: '160px' }}
                />
              </FlexItem>
              <FlexItem>
                <TextInput
                  id="vol-tag-value"
                  value={tagValue}
                  onChange={(_event, val) => setTagValue(val)}
                  placeholder="Value"
                  style={{ width: '160px' }}
                />
              </FlexItem>
              <FlexItem>
                <Button variant="secondary" onClick={handleAddTag}>
                  Add
                </Button>
              </FlexItem>
            </Flex>
            {tags.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                {tags.map((tag, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '4px', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px' }}>{tag.key}: {tag.value}</span>
                    <Button variant="plain" onClick={() => handleRemoveTag(i)} style={{ padding: '2px' }}>
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

export default RegisterVolumeModal;
