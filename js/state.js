export const state = {
    mode: null, 
    parserData: null,
    mapperData: {
        curriculumData: null,
        scheduleData: null,
        classMappings: {},
        subjectLinkMap: {}
    },
    selectedEntityId: null,
    uniqueSubjects: [],
    activeTab: 'classes',
};

if (typeof window !== 'undefined') {
    window.state = state;
}
