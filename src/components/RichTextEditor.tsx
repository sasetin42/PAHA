import React, { useMemo, useRef } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

interface RichTextEditorProps {
    value: string;
    onChange: (content: string) => void;
    placeholder?: string;
    onImageUpload?: (file: File) => Promise<string>;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, onImageUpload }) => {
    const quillRef = useRef<ReactQuill>(null);

    const onImageUploadRef = useRef(onImageUpload);

    // Keep ref updated
    React.useEffect(() => {
        onImageUploadRef.current = onImageUpload;
    }, [onImageUpload]);

    const modules = useMemo(() => {
        const imageHandler = () => {
            const input = document.createElement('input');
            input.setAttribute('type', 'file');
            input.setAttribute('accept', 'image/*');
            input.click();

            input.onchange = async () => {
                const file = input.files?.[0];
                if (file && onImageUploadRef.current) {
                    try {
                        const url = await onImageUploadRef.current(file);
                        const quill = quillRef.current?.getEditor();
                        if (quill) {
                            const range = quill.getSelection();
                            if (range) {
                                quill.insertEmbed(range.index, 'image', url);
                            }
                        }
                    } catch (error) {
                        console.error("Image upload failed:", error);
                    }
                }
            };
        };

        return {
            toolbar: {
                container: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                    [{ 'color': [] }, { 'background': [] }],
                    ['link', 'image'],
                    ['clean']
                ],
                handlers: {
                    image: imageHandler
                }
            }
        };
    }, []);

    const formats = [
        'header',
        'bold', 'italic', 'underline', 'strike',
        'list', 'bullet',
        'color', 'background',
        'link', 'image'
    ];

    return (
        <div className="rich-text-editor-container">
            <style>{`
                .rich-text-editor-container .ql-container {
                    border-bottom-left-radius: 0.75rem;
                    border-bottom-right-radius: 0.75rem;
                    background: transparent;
                    min-height: 200px;
                    font-family: inherit;
                    font-size: 0.875rem;
                }
                .rich-text-editor-container .ql-toolbar {
                    border-top-left-radius: 0.75rem;
                    border-top-right-radius: 0.75rem;
                    background: #f8fafc;
                    border-color: #e2e8f0;
                }
                .dark .rich-text-editor-container .ql-toolbar {
                    background: #1e293b;
                    border-color: rgba(255, 255, 255, 0.1);
                }
                .dark .rich-text-editor-container .ql-container {
                    border-color: rgba(255, 255, 255, 0.1);
                    color: white;
                }
                .rich-text-editor-container .ql-stroke {
                    stroke: #64748b;
                }
                .dark .rich-text-editor-container .ql-stroke {
                    stroke: #94a3b8;
                }
                .rich-text-editor-container .ql-picker {
                    color: #64748b;
                }
                .dark .rich-text-editor-container .ql-picker {
                    color: #94a3b8;
                }
                .ql-editor.ql-blank::before {
                    color: #94a3b8;
                    font-style: normal;
                }
                .ql-editor {
                    min-height: 200px;
                }
            `}</style>
            <ReactQuill 
                ref={quillRef}
                theme="snow"
                value={value}
                onChange={onChange}
                modules={modules}
                formats={formats}
                placeholder={placeholder}
                className="bg-slate-50 dark:bg-slate-800 rounded-xl"
            />
        </div>
    );
};

export default RichTextEditor;
